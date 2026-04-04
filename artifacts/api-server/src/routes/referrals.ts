import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referralEventsTable, referrersTable, adminTasksTable, rewardClaimsTable } from "@workspace/db/schema";
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
  // Non-super-admins are always scoped to their own practice
  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id
    : null;
  const officeId = user.role !== "super_admin" && user.practice_id
    ? user.practice_id
    : rawOfficeId;

  const officeFilter = officeId
    ? eq(referralEventsTable.office_id, officeId)
    : undefined;

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
    })
    .from(referralEventsTable)
    .leftJoin(referrersTable, eq(referralEventsTable.referrer_id, referrersTable.id))
    .where(officeFilter)
    .orderBy(referralEventsTable.created_at);
  res.json(events);
});

router.post("/", async (req, res) => {
  const body = CreateReferralBody.parse(req.body);

  // ── Household duplicate check ────────────────────────────────────────────
  const householdResult = await checkHouseholdDuplicate(
    body.new_patient_name,
    body.new_patient_phone
  );

  // Insert the referral event with household fields
  const [event] = await db.insert(referralEventsTable).values({
    ...body,
    status: "Lead",
    household_id: householdResult.household_id,
    household_duplicate: householdResult.is_duplicate,
  }).returning();

  // Increment referrer's total_referrals
  await db
    .update(referrersTable)
    .set({ total_referrals: sql`${referrersTable.total_referrals} + 1` })
    .where(eq(referrersTable.id, body.referrer_id));

  // If duplicate household → create admin task and return early (no reward flow)
  if (householdResult.is_duplicate) {
    req.log.warn(
      { eventId: event.id, householdId: householdResult.household_id, conflictingEventId: householdResult.conflicting_event_id },
      "Household duplicate detected — creating admin review task"
    );

    await db.insert(adminTasksTable).values({
      task_type: "household-duplicate-review",
      referrer_id: body.referrer_id,
      referral_event_id: event.id,
      amount: 0,
      notes: `Household duplicate detected. Existing completed event: ${householdResult.conflicting_event_id ?? "unknown"}. Address match: ${householdResult.od_address_found ? "yes (OD address)" : "name only"}. Review and override if legitimate.`,
      completed: false,
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
      // ── Update referrer tier ─────────────────────────────────────────────
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

      // ── Generate one-time claim token ───────────────────────────────────
      let claimToken: string = referrer.referral_code; // fallback
      try {
        claimToken = crypto.randomUUID();
        await db.insert(rewardClaimsTable).values({
          claim_token:       claimToken,
          referral_event_id: id,
          referrer_id:       referrer.id,
          reward_value:      newTierData.rewardValue,
          status:            "pending",
        });
      } catch (claimErr) {
        req.log.error({ err: claimErr }, "Failed to create reward_claims record — using referral_code as fallback token");
        claimToken = referrer.referral_code;
      }

      req.log.info({ referralId: id, referrerId: referrer.id }, "Exam completed — sending reward notification to referrer");
      sendRewardNotification(
        referrer.name,
        referrer.phone,
        referrer.email ?? null,
        event.new_patient_name,
        claimToken,
        event.office ?? "Hallmark Dental",
        newTierData.rewardValue
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

// PATCH /api/referrals/:id/override-household
// Admin override: clear household_duplicate flag and mark the associated admin task done.
router.patch("/:id/override-household", async (req, res) => {
  const { id } = req.params;

  const [event] = await db
    .select()
    .from(referralEventsTable)
    .where(eq(referralEventsTable.id, id));

  if (!event) {
    res.status(404).json({ error: "Referral event not found" });
    return;
  }

  if (!event.household_duplicate) {
    res.status(400).json({ error: "This event is not flagged as a household duplicate" });
    return;
  }

  // Clear duplicate flag
  const [updatedEvent] = await db
    .update(referralEventsTable)
    .set({ household_duplicate: false })
    .where(eq(referralEventsTable.id, id))
    .returning();

  // Mark any associated household-duplicate admin task as complete
  await db
    .update(adminTasksTable)
    .set({ completed: true })
    .where(
      and(
        eq(adminTasksTable.referral_event_id, id),
        eq(adminTasksTable.task_type, "household-duplicate-review"),
        eq(adminTasksTable.completed, false)
      )
    );

  const [referrer] = await db
    .select()
    .from(referrersTable)
    .where(eq(referrersTable.id, event.referrer_id));

  req.log.info({ eventId: id, referrerId: event.referrer_id }, "Household duplicate overridden by admin");

  res.json({ ...updatedEvent, referrer_name: referrer?.name ?? null });
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
