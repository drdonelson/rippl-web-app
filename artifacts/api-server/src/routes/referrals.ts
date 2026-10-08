import { resolveHouseholdReview, completeManualReferral, deliverCompletionNotification } from "../services/referralCompletion";
import { assertTenant, RewardError } from "../services/rewardRedemption";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, adminTasksTable, rewardClaimsTable, officesTable } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import {
  CreateReferralBody,
  UpdateReferralStatusParams,
  UpdateReferralStatusBody,
  GetReferralByTokenParams,
} from "@workspace/api-zod";
import { sendRewardNotification } from "../services/notifications";
import { scheduleOnboardingSms } from "../services/onboardingSms";
import { chargeReferralCompletion } from "../services/billingService";

const router: IRouter = Router();

router.use((req, res, next) => {
  if (req.authUser?.role !== "super_admin" && !req.authUser?.practice_id) { res.status(403).json({ error: "Tenant membership required" }); return; }
  next();
});
router.param("id", async (req, res, next, id) => {
  const [event] = await db.select({ practice_id: referralEventsTable.practice_id }).from(referralEventsTable).where(eq(referralEventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Referral event not found" }); return; }
  try { assertTenant(event.practice_id, req.authUser); next(); }
  catch (err) { if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; } next(err); }
});

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
  const practiceId = user.role !== "super_admin"
    ? user.practice_id
    : (typeof req.query.practice_id === "string" ? req.query.practice_id : null);

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

  // Block self-referrals and circular referrals (A referred B → B cannot refer A back)
  const [currentReferrer] = await db
    .select({ phone: referrersTable.phone, name: referrersTable.name, practice_id: referrersTable.practice_id })
    .from(referrersTable)
    .where(eq(referrersTable.id, body.referrer_id));

  if (!currentReferrer) { res.status(404).json({ error: "Referrer not found" }); return; }
  try { assertTenant(currentReferrer.practice_id, user); }
  catch (err) { if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; } throw err; }
  // A shared phone is not proof of self/circular referral. Manual intake is a lead;
  // qualification and identity confirmation happen before completion.
  const officeId = user.role !== "super_admin" && user.office_id ? user.office_id : body.office_id ?? null;
  let officeName = body.office ?? "";
  if (officeId) {
    const [office] = await db.select().from(officesTable).where(eq(officesTable.id, officeId));
    if (!office || office.practice_id !== currentReferrer.practice_id) { res.status(400).json({ error: "Office ownership mismatch" }); return; }
    officeName = office.name;
  }
  const [event] = await db.insert(referralEventsTable).values({
    new_patient_name:    body.new_patient_name,
    new_patient_phone:   body.new_patient_phone,
    referrer_id:         body.referrer_id,
    team_source:         body.team_source,
    office:              officeName,
    office_id:           officeId,
    practice_id:         currentReferrer.practice_id,
    status:              "Lead",
    household_id:        null,
    household_duplicate: false,
  }).returning();

  res.status(201).json({ ...event, referrer_name: currentReferrer.name });
});

router.patch("/:id/status", async (req, res) => {
  const { id } = UpdateReferralStatusParams.parse(req.params);
  const body = UpdateReferralStatusBody.parse(req.body);
  try {
    if (body.status === "Exam Completed") {
      const completion = await completeManualReferral(id, req.authUser!);
      if (completion?.created) {
        chargeReferralCompletion(id).catch(err => req.log.error({ err }, "Manual completion billing failed"));
        await deliverCompletionNotification(completion);
        const event = completion.event;
        if (event.new_patient_phone) scheduleOnboardingSms({ newPatientName: event.new_patient_name,
          newPatientPhone: event.new_patient_phone, referralEventId: id, officeId: event.office_id,
          practiceId: event.practice_id, patientId: event.new_patient_pat_num,
        }).catch(err => req.log.error({ err }, "Onboarding failed"));
      }
    } else {
      // Financial transitions cannot be bypassed with a status edit or rolled back by
      // a concurrent request. Reward Sent is written only by redemption.
      const updated = await db.update(referralEventsTable).set({ status: body.status }).where(and(
        eq(referralEventsTable.id, id), sql`${referralEventsTable.status} NOT IN ('Exam Completed', 'Completed', 'Reward Sent')`,
        sql`${body.status} <> 'Reward Sent'`,
      )).returning();
      if (!updated.length) throw new RewardError(409, "Completed referrals require reconciliation");
    }
    const [event] = await db.select().from(referralEventsTable).where(eq(referralEventsTable.id, id));
    const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, event.referrer_id));
    res.json({ ...event, referrer_name: referrer?.name ?? null });
  } catch (err) {
    if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; }
    throw err;
  }
});

for (const [path, approve] of [["override-household", true], ["dismiss-household", false]] as const) {
  router.patch(`/:id/${path}`, async (req, res) => {
    try {
      const result = await resolveHouseholdReview(String(req.params.id), req.authUser!, approve);
      await deliverCompletionNotification(result);
      res.json(result.event);
    } catch (err) {
      if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; }
      throw err;
    }
  });
}

router.post("/:id/resend-notification", async (req, res) => {
  const { id } = req.params;

  const [event] = await db.select().from(referralEventsTable).where(eq(referralEventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Referral event not found" }); return; }
  if (!["Exam Completed", "Completed"].includes(event.status)) { res.status(400).json({ error: "Can only resend for events with status 'Exam Completed'" }); return; }

  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, event.referrer_id));
  if (!referrer) { res.status(404).json({ error: "Referrer not found" }); return; }

  const [claim] = await db.select().from(rewardClaimsTable).where(eq(rewardClaimsTable.referral_event_id, id));
  if (!claim || claim.status !== "pending") { res.status(409).json({ error: "No pending claim to resend" }); return; }
  const claimToken = claim.claim_token;
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

  if (!result.errors.length) await db.update(adminTasksTable).set({ status: "completed", completed: true }).where(and(
    eq(adminTasksTable.referral_event_id, id), eq(adminTasksTable.task_type, "reward-notification"),
  ));
  res.json({ success: !result.errors.length, ...result });
});

router.get("/by-token/:token", async (req, res) => {
  const { token } = GetReferralByTokenParams.parse(req.params);

  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.referral_code, token));
  if (!referrer) { res.status(404).json({ error: "Invalid referral token" }); return; }
  try { assertTenant(referrer.practice_id, req.authUser); }
  catch (err) { if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; } throw err; }

  const [referral] = await db
    .select()
    .from(referralEventsTable)
    .where(eq(referralEventsTable.referrer_id, referrer.id))
    .orderBy(referralEventsTable.created_at);

  if (!referral) { res.status(404).json({ error: "No referral events found for this token" }); return; }

  res.json({ referral: { ...referral, referrer_name: referrer.name }, referrer });
});

export default router;
