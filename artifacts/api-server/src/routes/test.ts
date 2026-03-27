import { Router, type IRouter } from "express";
import { sendRewardNotification } from "../services/notifications";

const router: IRouter = Router();

// POST /api/test/notification — sends a test SMS and email to verify credentials
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

export default router;
