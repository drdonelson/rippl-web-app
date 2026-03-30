import { Router, type IRouter } from "express";
import { sendRewardNotification } from "../services/notifications";
import { sendOnboardingSmsNow } from "../services/onboardingSms";

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
    "TEST-TOKEN"
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
    preview: `Hi ${firstName} — welcome to Hallmark Dental! We're so glad you came in. If you know anyone who could use a great dentist, share your personal link and earn a reward when they become a patient: https://joinrippl.com/refer?ref=${code} 🦷`,
  });
});

export default router;
