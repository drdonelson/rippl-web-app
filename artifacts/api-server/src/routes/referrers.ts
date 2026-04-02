import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  CreateReferrerBody,
  GetReferrerQrParams,
} from "@workspace/api-zod";
import { isStaff } from "../middleware/auth";

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
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:3001";
  const referral_url = `https://${domain}/claim?ref=${referrer.referral_code}`;
  res.json({ referral_url, referral_code: referrer.referral_code });
});

export default router;
