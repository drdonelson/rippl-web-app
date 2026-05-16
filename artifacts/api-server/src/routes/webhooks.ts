import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  practicesTable,
  referralEventsTable,
  referrersTable,
  rewardClaimsTable,
  adminTasksTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getVagaroAccessToken, getFormResponse, extractReferralName } from "../services/vagaro";
import { matchReferrerByName } from "../lib/matchReferrer";
import { sendRewardNotification } from "../services/notifications";
import { calculateTier } from "../lib/tierUtils";

const router: IRouter = Router();

// ── POST /api/webhooks/vagaro ─────────────────────────────────────────────────
// Vagaro fires this when an appointment is updated.
// We care about: bookingStatus="Service Completed" + appointmentTypeCode="NR" (new client).
// When detected, we fetch formResponseIds, look for a referral name field, then
// match it to an existing referrer or create an unmatched-referral admin task.
router.post("/vagaro", async (req, res) => {
  logger.info({ body: req.body }, "[webhook/vagaro] Incoming payload");

  // Acknowledge immediately — Vagaro expects 200 within a few seconds.
  res.status(200).json({ received: true });

  const body = req.body as {
    bookingStatus?: string;
    appointmentTypeCode?: string;
    appointmentId?: string;
    businessId?: string;
    serviceDate?: string;
    clientName?: string;
    clientPhone?: string;
    formResponseIds?: string[];
  };

  // Only process completed first-time visits.
  if (body.bookingStatus !== "Service Completed") return;
  if (body.appointmentTypeCode !== "NR") return;

  const appointmentId = body.appointmentId;
  const businessId    = body.businessId;
  const clientName    = body.clientName ?? "Unknown";
  const clientPhone   = body.clientPhone ?? "";

  if (!appointmentId || !businessId) {
    logger.warn({ body }, "[webhook/vagaro] Missing appointmentId or businessId — skipping");
    return;
  }

  // Find the salon practice by vagaro_business_id in integration_config.
  // We do a basic scan since Vagaro business IDs map 1:1 to practices.
  const practices = await db
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.vertical, "salon"));

  let practice = practices.find(
    p => (p.integration_config as Record<string, string>)?.["vagaro_business_id"] === businessId,
  );

  if (!practice) {
    logger.warn({ businessId }, "[webhook/vagaro] No salon practice found for this business ID");
    return;
  }

  const practiceId  = practice.id;
  const config      = (practice.integration_config ?? {}) as Record<string, string>;
  const vagaroKey   = config["vagaro_api_key"] ?? "";
  const vagaroSecret = config["vagaro_api_secret"] ?? "";

  // Dedup: skip if we've already processed this appointment.
  const [existing] = await db
    .select({ id: referralEventsTable.id })
    .from(referralEventsTable)
    .where(
      and(
        eq(referralEventsTable.external_proc_num, appointmentId),
        eq(referralEventsTable.practice_id, practiceId),
      ),
    );

  if (existing) {
    logger.info({ appointmentId, practiceId }, "[webhook/vagaro] Already processed — skipping");
    return;
  }

  // Fetch form responses and look for a referral name field.
  let referralName: string | null = null;

  if (vagaroKey && vagaroSecret && body.formResponseIds?.length) {
    try {
      const accessToken = await getVagaroAccessToken(vagaroKey, vagaroSecret);
      const formResponses = (
        await Promise.all(
          body.formResponseIds.map(id => getFormResponse(id, accessToken)),
        )
      ).filter(Boolean) as Awaited<ReturnType<typeof getFormResponse>>[];

      referralName = extractReferralName(
        formResponses.filter(r => r !== null) as NonNullable<typeof formResponses[0]>[],
      );
    } catch (err) {
      logger.error({ err, appointmentId }, "[webhook/vagaro] Error fetching form responses");
    }
  }

  if (!referralName) {
    logger.info({ appointmentId }, "[webhook/vagaro] No referral name in form responses — skipping reward");
    return;
  }

  // Match to an existing referrer.
  const matchResult = await matchReferrerByName(referralName, practiceId, clientPhone);

  if (!matchResult) {
    // Create unmatched-referral admin task so no referral is lost.
    await db.insert(adminTasksTable).values({
      task_type:   "unmatched-referral",
      practice_id: practiceId,
      notes:       `Vagaro appointment ${appointmentId}: new client "${clientName}" named "${referralName}" as their referrer but no match was found in the system. Client phone: ${clientPhone || "none"}.`,
      status:      "pending",
    });
    logger.info(
      { appointmentId, referralName, practiceId },
      "[webhook/vagaro] Unmatched referral — admin task created",
    );
    return;
  }

  const { referrer } = matchResult;

  // Insert referral event.
  const [newEvent] = await db.insert(referralEventsTable).values({
    new_patient_name:    clientName,
    new_patient_phone:   clientPhone,
    new_patient_pat_num: appointmentId,
    referrer_id:         referrer.id,
    team_source:         "vagaro-webhook",
    office:              practice.name,
    office_id:           null,
    practice_id:         practiceId,
    external_proc_num:   appointmentId,
    status:              "Exam Completed",
  }).returning();

  if (!newEvent) {
    logger.error({ appointmentId }, "[webhook/vagaro] Failed to insert referral_event");
    return;
  }

  const tierData = calculateTier(referrer.total_referrals + 1);

  await db
    .update(referrersTable)
    .set({
      total_referrals:  referrer.total_referrals + 1,
      tier:             tierData.name,
      tier_unlocked_at: tierData.name !== referrer.tier ? new Date() : referrer.tier_unlocked_at,
      reward_value:     tierData.rewardValue,
    })
    .where(eq(referrersTable.id, referrer.id));

  const claimToken = crypto.randomUUID();
  await db.insert(rewardClaimsTable).values({
    claim_token:       claimToken,
    referral_event_id: newEvent.id,
    referrer_id:       referrer.id,
    reward_value:      tierData.rewardValue,
    practice_id:       practiceId,
    status:            "pending",
  });

  sendRewardNotification(
    referrer.name,
    referrer.phone,
    referrer.email ?? null,
    newEvent.new_patient_name,
    claimToken,
    practice.name,
    tierData.rewardValue,
    practiceId,
  ).catch((err) => {
    logger.error({ err, appointmentId }, "[webhook/vagaro] Notification failed");
  });

  logger.info(
    { appointmentId, referrerId: referrer.id, matchType: matchResult.matchType, claimToken },
    "[webhook/vagaro] Referral processed successfully",
  );
});

// ── POST /api/webhooks/manual/:officeId ───────────────────────────────────────
// Generic manual trigger for "Other" vertical practices with custom workflows.
router.post("/manual/:officeId", (req, res) => {
  const { officeId } = req.params;
  logger.info({ officeId, body: req.body }, "[webhook/manual] Manual referral trigger received");
  // TODO: validate a shared secret, create referral_event + reward_claim
  res.status(200).json({ received: true, officeId });
});

export default router;
