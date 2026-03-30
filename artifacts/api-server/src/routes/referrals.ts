import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  CreateReferralBody,
  UpdateReferralStatusParams,
  UpdateReferralStatusBody,
  GetReferralByTokenParams,
} from "@workspace/api-zod";
import { sendRewardNotification } from "../services/notifications";
import { scheduleOnboardingSms } from "../services/onboardingSms";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const events = await db
    .select({
      id: referralEventsTable.id,
      new_patient_name: referralEventsTable.new_patient_name,
      new_patient_phone: referralEventsTable.new_patient_phone,
      referrer_id: referralEventsTable.referrer_id,
      referrer_name: referrersTable.name,
      team_source: referralEventsTable.team_source,
      office: referralEventsTable.office,
      status: referralEventsTable.status,
      reward_type: referralEventsTable.reward_type,
      created_at: referralEventsTable.created_at,
    })
    .from(referralEventsTable)
    .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
    .orderBy(referralEventsTable.created_at);
  res.json(events);
});

router.post("/", async (req, res) => {
  const body = CreateReferralBody.parse(req.body);
  const [event] = await db.insert(referralEventsTable).values({
    ...body,
    status: "Lead",
  }).returning();

  // Increment referrer's total_referrals
  await db
    .update(referrersTable)
    .set({ total_referrals: sql`${referrersTable.total_referrals} + 1` })
    .where(eq(referrersTable.id, body.referrer_id));

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
      req.log.info({ referralId: id, referrerId: referrer.id }, "Exam completed — sending reward notification to referrer");
      // Fire-and-forget: do not await so response isn't delayed
      sendRewardNotification(
        referrer.name,
        referrer.phone,
        referrer.email ?? null,
        event.new_patient_name,
        referrer.referral_code
      ).then((result) => {
        req.log.info({ result }, "Reward notification result");
      }).catch((err) => {
        req.log.error({ err }, "Reward notification error");
      });
    }

    // Schedule onboarding SMS for the new patient (fires in 2 hours)
    // Only fires if the new patient isn't already a referrer or hasn't been sent this SMS before
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

router.get("/by-token/:token", async (req, res) => {
  const { token } = GetReferralByTokenParams.parse(req.params);

  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.referral_code, token));

  if (!referrer) {
    res.status(404).json({ error: "Invalid referral token" });
    return;
  }

  // Get the most recent referral for this referrer
  const [referral] = await db
    .select()
    .from(referralEventsTable)
    .where(eq(referralEventsTable.referrer_id, referrer.id))
    .orderBy(referralEventsTable.created_at);

  if (!referral) {
    res.status(404).json({ error: "No referral events found for this token" });
    return;
  }

  res.json({
    referral: { ...referral, referrer_name: referrer.name },
    referrer,
  });
});

export default router;
