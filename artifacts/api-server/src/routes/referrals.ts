import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, adminTasksTable, rewardClaimsTable, staffPoolConfigsTable, staffPoolEntriesTable } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import {
  CreateReferralBody,
  UpdateReferralStatusParams,
  UpdateReferralStatusBody,
  GetReferralByTokenParams,
} from "@workspace/api-zod";
import { sendRewardNotification } from "../services/notifications";
import { scheduleOnboardingSms } from "../services/onboardingSms";
import { checkHouseholdDuplicate } from "../services/householdDuplicate";
import { calculateTier } from "../lib/tierUtils";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const user = req.authUser!;

  // office_id: intra-practice scoping (staff/practice_admin → their office)
  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id
    : null;
  const officeId = user.role !== "super_admin" && user.office_id
    ? user.office_id
    : rawOfficeId;

  // practice_id: cross-tenant isolation
  const practiceId = user.role !== "super_admin" ? user.practice_id : null;

  const filters = [
    officeId   ? eq(referralEventsTable.office_id,   officeId)   : undefined,
    practiceId ? eq(referralEventsTable.practice_id, practiceId) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  const events = await db
    .select({
      id: referralEventsTable.id,
      new_patient_name: referralEventsTable.new_patient_name,
      new_patient_phone: referralEventsTable.new_patient_phone,
      referrer_id: referralEventsTable.referrer_id,
      referrer_name: referrersTable.name,
      team_source: referralEventsTable.team_source,
      office: referralEventsTable.office,
      office_id: referralEventsTable.office_id,
      status: referralEventsTable.status,
      reward_type: referralEventsTable.reward_type,
      household_id: referralEventsTable.household_id,
      household_duplicate: referralEventsTable.household_duplicate,
      created_at: referralEventsTable.created_at,
      // Most recent reward claim status — used to distinguish confirmed-ineligible from under-review
      claim_status: sql<string | null>`(SELECT status FROM reward_claims WHERE referral_event_id = ${referralEventsTable.id} ORDER BY created_at DESC LIMIT 1)`,
    })
    .from(referralEventsTable)
    .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(referralEventsTable.created_at);
  res.json(events);
});

router.post("/", async (req, res) => {
  const user = req.authUser!;
  const body = CreateReferralBody.parse(req.body);

  const householdResult = await checkHouseholdDuplicate(
    body.new_patient_name,
    body.new_patient_phone
  );

  const [event] = await db.insert(referralEventsTable).values({
    ...body,
    practice_id: user.practice_id,
    status: "Lead",
    household_id: householdResult.household_id,
    household_duplicate: householdResult.is_duplicate,
  }).returning();

  await db
    .update(referrersTable)
    .set({ total_referrals: sql`${referrersTable.total_referrals} + 1` })
    .where(eq(referrersTable.id, body.referrer_id));

  if (householdResult.is_duplicate) {
    req.log.warn(
      { eventId: event.id, householdId: householdResult.household_id, conflictingEventId: householdResult.conflicting_event_id },
      "Household duplicate detected — creating admin review task"
    );

    await db.insert(adminTasksTable).values({
      practice_id:       user.practice_id,
      task_type:         "household-duplicate-review",
      referrer_id:       body.referrer_id,
      referral_event_id: event.id,
      amount:            0,
      notes: `Household duplicate detected. Existing completed event: ${householdResult.conflicting_event_id ?? "unknown"}. Address match: ${householdResult.od_address_found ? "yes (OD address)" : "name only"}. Review and override if legitimate.`,
      status: "pending",
    });

    res.status(201).json({ ...event, referrer_name: null });
    return;
  }

  res.status(201).json({ ...event, referrer_name: null });
});

router.patch("/:id/status", async (req, res) => {
  const { id } = UpdateReferralStatusParams.parse(req.params);
  const body = UpdateReferralStatusBody.parse(req.body);

  const [event] = await db
    .update(referralEventsTable)
    .set({ status: body.status })
    .where(eq(referralEventsTable.id, id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Referral event not found" });
    return;
  }

  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, event.referrer_id));

  if (body.status === "Exam Completed") {
    if (referrer) {
      try {
        const newTotal    = (referrer.total_referrals ?? 0) + 1;
        const oldTier     = referrer.tier ?? "starter";
        const newTierData = calculateTier(newTotal);

        await db
          .update(referrersTable)
          .set({
            total_referrals: newTotal,
            tier: newTierData.name,
            reward_value: newTierData.rewardValue,
            ...(newTierData.name !== oldTier ? { tier_unlocked_at: new Date() } : {}),
          })
          .where(eq(referrersTable.id, referrer.id));

        if (newTierData.name !== oldTier) {
          req.log.info({ referrerId: referrer.id, oldTier, newTier: newTierData.name }, "Tier upgraded");
        }
      } catch (tierErr) {
        req.log.error({ err: tierErr }, "Failed to update referrer tier");
      }

      // Staff pool: add contribution entry if practice has pool enabled
      if (event.practice_id) {
        try {
          const [poolConfig] = await db
            .select()
            .from(staffPoolConfigsTable)
            .where(eq(staffPoolConfigsTable.practice_id, event.practice_id));
          if (poolConfig?.enabled) {
            await db.insert(staffPoolEntriesTable).values({
              practice_id: event.practice_id,
              amount:      poolConfig.amount_per_referral,
            });
          }
        } catch (poolErr) {
          req.log.error({ err: poolErr }, "Failed to insert staff pool entry");
        }
      }

      let claimToken: string = referrer.referral_code;
      try {
        claimToken = crypto.randomUUID();
        await db.insert(rewardClaimsTable).values({
          practice_id:       event.practice_id,
          claim_token:       claimToken,
          referral_event_id: id,
          referrer_id:       referrer.id,
          reward_value:      (calculateTier((referrer.total_referrals ?? 0) + 1)).rewardValue,
          status:            "pending",
        });
      } catch (claimErr) {
        try {
          const [existing] = await db
            .select({ claim_token: rewardClaimsTable.claim_token })
            .from(rewardClaimsTable)
            .where(eq(rewardClaimsTable.referral_event_id, id));
          if (existing?.claim_token) {
            claimToken = existing.claim_token;
            req.log.info({ claimToken, referralId: id }, "Using existing claim token for event");
          } else {
            req.log.error({ err: claimErr }, "Failed to create reward_claims record — falling back to referral_code");
            claimToken = referrer.referral_code;
          }
        } catch {
          req.log.error({ err: claimErr }, "Failed to look up reward_claims record — falling back to referral_code");
          claimToken = referrer.referral_code;
        }
      }

      req.log.info({ referralId: id, referrerId: referrer.id }, "Exam completed — sending reward notification");
      sendRewardNotification(
        referrer.name,
        referrer.phone,
        referrer.email ?? null,
        event.new_patient_name,
        claimToken,
        event.office ?? "Hallmark Dental",
        (calculateTier((referrer.total_referrals ?? 0) + 1)).rewardValue,
        event.practice_id ?? undefined,
      ).then((result) => {
        req.log.info({ result }, "Reward notification result");
      }).catch((err) => {
        req.log.error({ err }, "Reward notification error");
      });
    }

    if (event.new_patient_phone) {
      scheduleOnboardingSms({
        newPatientName:  event.new_patient_name,
        newPatientPhone: event.new_patient_phone,
        referralEventId: id,
      }).then((result) => {
        if (result.skipped) {
          req.log.info({ referralId: id }, "Onboarding SMS skipped — patient already enrolled");
        } else {
          req.log.info({ referralId: id, referrerId: result.referrerId, code: result.referralCode }, "Onboarding SMS scheduled");
        }
      }).catch((err) => {
        req.log.error({ err, referralId: id }, "Failed to schedule onboarding SMS");
      });
    }
  }

  res.json({ ...event, referrer_name: referrer?.name ?? null });
});

router.patch("/:id/override-household", async (req, res) => {
  const { id } = req.params;

  const [event] = await db
    .select()
    .from(referralEventsTable)
    .where(eq(referralEventsTable.id, id));

  if (!event) { res.status(404).json({ error: "Referral event not found" }); return; }
  if (!event.household_duplicate) { res.status(400).json({ error: "This event is not flagged as a household duplicate" }); return; }

  const [updatedEvent] = await db
    .update(referralEventsTable)
    .set({ household_duplicate: false })
    .where(eq(referralEventsTable.id, id))
    .returning();

  await db
    .update(adminTasksTable)
    .set({ status: "completed", completed: true })
    .where(and(
      eq(adminTasksTable.referral_event_id, id),
      eq(adminTasksTable.task_type, "household-duplicate-review"),
      eq(adminTasksTable.status, "pending")
    ));

  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, event.referrer_id));

  req.log.info({ eventId: id, referrerId: event.referrer_id }, "Household duplicate overridden by admin");
  res.json({ ...updatedEvent, referrer_name: referrer?.name ?? null });
});

router.post("/:id/resend-notification", async (req, res) => {
  const { id } = req.params;

  const [event] = await db.select().from(referralEventsTable).where(eq(referralEventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Referral event not found" }); return; }
  if (event.status !== "Exam Completed") { res.status(400).json({ error: "Can only resend for events with status 'Exam Completed'" }); return; }

  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, event.referrer_id));
  if (!referrer) { res.status(404).json({ error: "Referrer not found" }); return; }

  const [claim] = await db.select().from(rewardClaimsTable).where(eq(rewardClaimsTable.referral_event_id, id));
  const claimToken  = claim?.claim_token ?? referrer.referral_code;
  const rewardValue = claim?.reward_value ?? referrer.reward_value ?? 35;

  req.log.info({ eventId: id, referrerId: referrer.id, claimToken }, "Resending reward notification");

  const result = await sendRewardNotification(
    referrer.name,
    referrer.phone,
    referrer.email ?? null,
    event.new_patient_name,
    claimToken,
    event.office ?? "Hallmark Dental",
    rewardValue,
    event.practice_id ?? undefined,
  );

  res.json({ success: true, ...result });
});

router.get("/by-token/:token", async (req, res) => {
  const { token } = GetReferralByTokenParams.parse(req.params);

  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.referral_code, token));
  if (!referrer) { res.status(404).json({ error: "Invalid referral token" }); return; }

  const [referral] = await db
    .select()
    .from(referralEventsTable)
    .where(eq(referralEventsTable.referrer_id, referrer.id))
    .orderBy(referralEventsTable.created_at);

  if (!referral) { res.status(404).json({ error: "No referral events found for this token" }); return; }

  res.json({ referral: { ...referral, referrer_name: referrer.name }, referrer });
});

export default router;
