import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, referralLinkDeliveriesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateReferrerBody,
  GetReferrerQrParams,
} from "@workspace/api-zod";
import { isStaff } from "../middleware/auth";
import { sendReferralLinkToPatient, getLastDelivery, type SendChannel } from "../services/referralLinkService";

const router: IRouter = Router();

function generateReferralCode(name: string): string {
  const clean = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
}

router.get("/", async (req, res) => {
  const user = req.authUser!;
  // Non-super-admins are always scoped to their own practice
  const rawOfficeId = typeof req.query.office_id === "string" && req.query.office_id !== "all"
    ? req.query.office_id : undefined;
  const effectiveOfficeId = user.role !== "super_admin" && user.practice_id
    ? user.practice_id
    : rawOfficeId;

  const conditions = effectiveOfficeId
    ? [eq(referrersTable.office_id, effectiveOfficeId)]
    : [];
  const referrers = await db
    .select()
    .from(referrersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(referrersTable.created_at);
  res.json(referrers);
});

router.post("/", async (req, res) => {
  const user = req.authUser!;
  const body = CreateReferrerBody.parse(req.body);

  // Staff can only create patients tagged to their own assigned office.
  if (isStaff(user)) {
    if (!user.practice_id) {
      res.status(403).json({ error: "Your staff account has no assigned office." });
      return;
    }
    body.office_id = user.practice_id;
  }

  const referral_code = generateReferralCode(body.name);
  const [referrer] = await db.insert(referrersTable).values({
    ...body,
    referral_code,
  }).returning();
  res.status(201).json(referrer);
});

router.get("/:id/qr", async (req, res) => {
  const { id } = GetReferrerQrParams.parse(req.params);
  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, id));
  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }

  // Resolve the public base URL using the priority chain:
  //   1. PUBLIC_APP_URL  — canonical production domain (https://www.joinrippl.com)
  //   2. APP_URL         — legacy secret, same purpose
  //   3. REPLIT_DOMAINS  — Replit dev preview (works in dev, not on Render)
  //   4. Hard-coded joinrippl.com — last resort so localhost never leaks into QR codes
  const publicAppUrl = (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "") ||
    "https://www.joinrippl.com"
  ).replace(/\/$/, "");

  const referral_url = `${publicAppUrl}/refer?ref=${encodeURIComponent(referrer.referral_code)}`;
  res.json({ referral_url, referral_code: referrer.referral_code });
});

// GET /api/referrers/:id/last-delivery — most recent link delivery for a referrer
router.get("/:id/last-delivery", async (req, res) => {
  const { id } = req.params;
  const [referrer] = await db.select({ id: referrersTable.id }).from(referrersTable).where(eq(referrersTable.id, id));
  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }
  const last = await getLastDelivery(id);
  res.json(last ?? null);
});

// POST /api/referrers/:id/send-link — manually send referral link via SMS and/or email
router.post("/:id/send-link", async (req, res) => {
  const { id } = req.params;
  const { channels, customMessage } = req.body as {
    channels?: unknown;
    customMessage?: string;
  };

  // Validate channels array
  if (!Array.isArray(channels) || channels.length === 0) {
    res.status(400).json({ error: "channels must be a non-empty array of 'sms' and/or 'email'" });
    return;
  }
  const validChannels: SendChannel[] = ["sms", "email"];
  const requested = channels as string[];
  const invalid = requested.filter(c => !validChannels.includes(c as SendChannel));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Invalid channels: ${invalid.join(", ")}` });
    return;
  }

  // Load referrer
  const [referrer] = await db.select().from(referrersTable).where(eq(referrersTable.id, id));
  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }

  try {
    const result = await sendReferralLinkToPatient(id, {
      channels: requested as SendChannel[],
      customMessage: customMessage?.trim() || undefined,
      respectCooldown: false, // manual sends always bypass cooldown
      reason: "manual_staff_send",
    });
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
