import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, referralLeadsTable } from "@workspace/db/schema";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Demo code intercept ───────────────────────────────────────────────────────
// These codes match DEMO_REFERRERS in the frontend demo-data.ts.
// When a demo QR code is scanned the /refer page calls GET /:code. Since demo
// referrers don't exist in the real DB, we short-circuit here and return mock
// data so the /refer page renders correctly without a 404.

const DEMO_CODE_LOOKUP: Record<string, {
  referrer_id: string;
  referrer_name: string;
  referral_code: string;
  office_name: string;
}> = {
  MIKE1001: { referrer_id: "demo-r1", referrer_name: "Mike",     referral_code: "MIKE1001", office_name: "Brentwood" },
  LISA1002: { referrer_id: "demo-r2", referrer_name: "Lisa",     referral_code: "LISA1002", office_name: "Lewisburg" },
  ROBE1003: { referrer_id: "demo-r3", referrer_name: "Robert",   referral_code: "ROBE1003", office_name: "Greenbrier" },
  JENN1004: { referrer_id: "demo-r4", referrer_name: "Jennifer", referral_code: "JENN1004", office_name: "Brentwood" },
  DAVI1005: { referrer_id: "demo-r5", referrer_name: "David",    referral_code: "DAVI1005", office_name: "Lewisburg" },
};

router.get("/:code", async (req, res) => {
  const code = req.params.code?.trim();
  if (!code) {
    res.status(400).json({ error: "Referral code is required" });
    return;
  }

  // Short-circuit: return demo data without a DB hit
  const demoMatch = DEMO_CODE_LOOKUP[code.toUpperCase()];
  if (demoMatch) {
    res.json(demoMatch);
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
