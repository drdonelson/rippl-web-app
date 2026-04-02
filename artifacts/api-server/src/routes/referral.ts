import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, referralLeadsTable } from "@workspace/db/schema";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/:code", async (req, res) => {
  const code = req.params.code?.trim();
  if (!code) {
    res.status(400).json({ error: "Referral code is required" });
    return;
  }

  const [referrer] = await db
    .select({
      id: referrersTable.id,
      name: referrersTable.name,
      referral_code: referrersTable.referral_code,
      office_id: referrersTable.office_id,
    })
    .from(referrersTable)
    .where(eq(referrersTable.referral_code, code));

  if (!referrer) {
    res.status(404).json({ error: "Referral code not found" });
    return;
  }

  let office_name: string | null = null;
  if (referrer.office_id) {
    const [office] = await db
      .select({ name: officesTable.name })
      .from(officesTable)
      .where(eq(officesTable.id, referrer.office_id));
    if (office) {
      const dash = office.name.lastIndexOf("–");
      office_name = dash !== -1 ? office.name.slice(dash + 2).trim() : office.name;
    }
  }

  res.json({
    referrer_id: referrer.id,
    referrer_name: referrer.name.split(" ")[0],
    referral_code: referrer.referral_code,
    office_name: office_name ?? "Hallmark Dental",
  });
});

router.post("/leads", async (req, res) => {
  const {
    first_name,
    last_name,
    phone,
    email,
    office_preference,
    referral_code,
    referrer_id,
    contact_preference,
    message,
    source,
  } = req.body as Record<string, string | undefined>;

  if (!first_name || !last_name || !phone) {
    res.status(400).json({ error: "first_name, last_name, and phone are required" });
    return;
  }

  const [lead] = await db.insert(referralLeadsTable).values({
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    office_preference: office_preference?.trim() || null,
    referral_code: referral_code?.trim() || null,
    referrer_id: referrer_id?.trim() || null,
    contact_preference: contact_preference?.trim() || null,
    message: message?.trim() || null,
    source: source?.trim() || "qr_landing_page",
  }).returning();

  res.status(201).json({ success: true, id: lead.id });
});

export default router;
