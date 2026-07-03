import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  practicesTable,
  referralEventsTable,
  referrersTable,
  rewardClaimsTable,
  adminTasksTable,
} from "@workspace/db/schema";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { sendRewardNotification } from "../services/notifications";
import { sendOnboardingSmsNow } from "../services/onboardingSms";
import { getVagaroAccessToken } from "../services/vagaro";
import { matchReferrerByName } from "../lib/matchReferrer";
import { calculateTier } from "../lib/tierUtils";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/test/notification — sends a test reward SMS and email
router.post("/notification", async (req, res) => {
  const testPhone = req.body.phone || "+15550000000";
  const testEmail = req.body.email || null;

  req.log.info({ testPhone, testEmail }, "Sending test notification");

  const result = await sendRewardNotification(
    "Test User",
    testPhone,
    testEmail,
    "Jane Smith",
    "TEST-TOKEN",
    req.body.office_name || "Hallmark Dental"
  );

  if (result.errors.length > 0 && !result.sms && !result.email) {
    res.status(500).json({ success: false, errors: result.errors });
    return;
  }

  res.json({
    success: true,
    sms: result.sms ?? null,
    email: result.email ?? null,
    errors: result.errors,
    message: "Test notification sent. Check your phone and email.",
  });
});

// POST /api/test/onboarding-sms — immediately sends the post-visit onboarding SMS (no 2h delay)
router.post("/onboarding-sms", async (req, res) => {
  const name  = (req.body.name  as string | undefined)?.trim() || "Test Patient";
  const phone = (req.body.phone as string | undefined)?.trim() || "+15550000000";
  const code  = (req.body.referral_code as string | undefined)?.trim() || "TEST-0001";

  req.log.info({ name, phone, code }, "Sending test onboarding SMS");

  const firstName = name.split(/\s+/)[0] ?? "there";
  const result = await sendOnboardingSmsNow(firstName, phone, code);

  if (!result.success) {
    res.status(500).json({ success: false, error: result.error });
    return;
  }

  res.json({
    success: true,
    smsSid: result.smsSid,
    message: `Onboarding SMS sent to ${phone}. Check the device.`,
    preview: `Hi ${firstName} — welcome to Hallmark Dental! We're so glad you came in. If you know anyone who could use a great dentist, share your personal link and earn a reward when they become a patient: https://www.joinrippl.com/refer?ref=${code} 🦷`,
  });
});

// POST /api/test/vagaro-credentials — super_admin only
// Validates Vagaro API credentials stored in a practice's integration_config.
router.post("/vagaro-credentials", requireAuth, requireSuperAdmin, async (req, res) => {
  const { practice_id, api_key, api_secret } = req.body as {
    practice_id?: string; api_key?: string; api_secret?: string;
  };

  let key = api_key?.trim();
  let secret = api_secret?.trim();

  if (practice_id && (!key || !secret)) {
    const [practice] = await db
      .select()
      .from(practicesTable)
      .where(eq(practicesTable.id, practice_id))
      .limit(1);

    if (!practice) { res.status(404).json({ ok: false, error: "Practice not found" }); return; }

    const config = (practice.integration_config ?? {}) as Record<string, string>;
    key   = key   || config["vagaro_api_key"];
    secret = secret || config["vagaro_api_secret"];
  }

  if (!key || !secret) {
    res.status(400).json({ ok: false, error: "No Vagaro credentials found. Set vagaro_api_key and vagaro_api_secret in integration_config." });
    return;
  }

  try {
    await getVagaroAccessToken(key, secret);
    logger.info({ practice_id }, "[test/vagaro-credentials] Credentials valid");
    res.json({ ok: true, message: "Credentials valid — token exchange succeeded." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ practice_id, err }, "[test/vagaro-credentials] Credential check failed");
    res.json({ ok: false, error: msg });
  }
});

// POST /api/test/vagaro-webhook — super_admin only
// Simulates a completed Vagaro appointment and runs the full referral matching pipeline.
// Creates real DB records and sends a real reward notification.
router.post("/vagaro-webhook", requireAuth, requireSuperAdmin, async (req, res) => {
  const {
    practice_id,
    client_name = "Test Client",
    referral_name,
    client_phone = "",
  } = req.body as {
    practice_id?: string; client_name?: string; referral_name?: string; client_phone?: string;
  };

  if (!practice_id) { res.status(400).json({ error: "practice_id required" }); return; }
  if (!referral_name?.trim()) { res.status(400).json({ error: "referral_name required" }); return; }

  const [practice] = await db
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.id, practice_id))
    .limit(1);

  if (!practice) { res.status(404).json({ error: "Practice not found" }); return; }
  if (practice.vertical !== "salon") { res.status(400).json({ error: "Practice must be salon vertical" }); return; }

  const referralNameTrimmed = referral_name.trim();
  const matchResult = await matchReferrerByName(referralNameTrimmed, practice_id, client_phone);

  if (!matchResult) {
    await db.insert(adminTasksTable).values({
      task_type:   "unmatched-referral",
      practice_id,
      notes:       `[TEST] Vagaro test: new client "${client_name}" named "${referralNameTrimmed}" as their referrer but no match was found.`,
      status:      "pending",
    });
    logger.info({ practice_id, referral_name: referralNameTrimmed }, "[test/vagaro-webhook] No match — admin task created");
    res.json({
      matched: false,
      referral_name: referralNameTrimmed,
      action: "admin_task_created",
      message: `No referrer found matching "${referralNameTrimmed}". Admin task created for manual review.`,
    });
    return;
  }

  const { referrer } = matchResult;
  const appointmentId = `test-${Date.now()}`;
  const tierData = calculateTier(referrer.total_referrals + 1);

  const [newEvent] = await db.insert(referralEventsTable).values({
    new_patient_name:    client_name,
    new_patient_phone:   client_phone,
    new_patient_pat_num: appointmentId,
    referrer_id:         referrer.id,
    team_source:         "vagaro-webhook-test",
    office:              practice.name,
    office_id:           null,
    practice_id,
    external_proc_num:   appointmentId,
    status:              "Exam Completed",
  }).returning();

  await db.update(referrersTable).set({
    total_referrals:  referrer.total_referrals + 1,
    tier:             tierData.name,
    tier_unlocked_at: tierData.name !== referrer.tier ? new Date() : referrer.tier_unlocked_at,
    reward_value:     tierData.rewardValue,
  }).where(eq(referrersTable.id, referrer.id));

  const claimToken = crypto.randomUUID();
  await db.insert(rewardClaimsTable).values({
    claim_token:       claimToken,
    referral_event_id: newEvent.id,
    referrer_id:       referrer.id,
    reward_value:      tierData.rewardValue,
    practice_id,
    status:            "pending",
  });

  void sendRewardNotification(
    referrer.name,
    referrer.phone,
    referrer.email ?? null,
    client_name,
    claimToken,
    practice.name,
    tierData.rewardValue,
    practice_id,
  );

  logger.info(
    { practice_id, referrerId: referrer.id, matchType: matchResult.matchType, appointmentId },
    "[test/vagaro-webhook] Test referral event created",
  );

  res.json({
    matched:      true,
    match_type:   matchResult.matchType,
    referrer:     { id: referrer.id, name: referrer.name, phone: referrer.phone },
    event_id:     newEvent.id,
    claim_token:  claimToken,
    reward_value: tierData.rewardValue,
    action:       "referral_event_created",
    message:      `Referral matched to ${referrer.name}. Reward notification sent.`,
  });
});

export default router;
