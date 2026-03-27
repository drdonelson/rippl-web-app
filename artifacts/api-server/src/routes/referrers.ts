import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  CreateReferrerBody,
  GetReferrerQrParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateReferralCode(name: string): string {
  const clean = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
}

router.get("/", async (req, res) => {
  const referrers = await db.select().from(referrersTable).orderBy(referrersTable.created_at);
  res.json(referrers);
});

router.post("/", async (req, res) => {
  const body = CreateReferrerBody.parse(req.body);
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
