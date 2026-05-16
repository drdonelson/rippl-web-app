import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { referrersTable, referralLeadsTable, practicesTable } from "@workspace/db/schema";
import { officesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Demo code intercept ───────────────────────────────────────────────────────
// These codes match DEMO_REFERRERS in the frontend demo-data.ts.
// When a demo QR code is scanned the /refer page calls GET /:code. Since demo
// referrers don't exist in the real DB, we short-circuit here and return mock
// data so the /refer page renders correctly without a 404.

interface PracticeInfo {
  id: string;
  display_name: string;
  vertical: string;
  logo_url: string | null;
  primary_color: string;
}

const DEMO_PRACTICE: PracticeInfo = {
  id: "demo-practice",
  display_name: "Hallmark Dental",
  vertical: "dental",
  logo_url: null,
  primary_color: "E0622A",
};

const DEMO_CODE_LOOKUP: Record<string, {
  referrer_id: string;
  referrer_name: string;
  referral_code: string;
  office_name: string;
  practice: PracticeInfo;
}> = {
  MIKE1001: { referrer_id: "demo-r1", referrer_name: "Mike",     referral_code: "MIKE1001", office_name: "Brentwood",  practice: DEMO_PRACTICE },
  LISA1002: { referrer_id: "demo-r2", referrer_name: "Lisa",     referral_code: "LISA1002", office_name: "Lewisburg",  practice: DEMO_PRACTICE },
  ROBE1003: { referrer_id: "demo-r3", referrer_name: "Robert",   referral_code: "ROBE1003", office_name: "Greenbrier", practice: DEMO_PRACTICE },
  JENN1004: { referrer_id: "demo-r4", referrer_name: "Jennifer", referral_code: "JENN1004", office_name: "Brentwood",  practice: DEMO_PRACTICE },
  DAVI1005: { referrer_id: "demo-r5", referrer_name: "David",    referral_code: "DAVI1005", office_name: "Lewisburg",  practice: DEMO_PRACTICE },
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
      id:           referrersTable.id,
      name:         referrersTable.name,
      referral_code: referrersTable.referral_code,
      office_id:    referrersTable.office_id,
      practice_id:  referrersTable.practice_id,
    })
    .from(referrersTable)
    .where(eq(referrersTable.referral_code, code));

  if (!referrer) {
    res.status(404).json({ error: "Referral code not found" });
    return;
  }

  const [officeRow, practiceRow] = await Promise.all([
    referrer.office_id
      ? db.select({ name: officesTable.name }).from(officesTable)
          .where(eq(officesTable.id, referrer.office_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    referrer.practice_id
      ? db.select({
          id:                      practicesTable.id,
          name:                    practicesTable.name,
          vertical:                practicesTable.vertical,
          white_label_name:        practicesTable.white_label_name,
          white_label_logo_url:    practicesTable.white_label_logo_url,
          logo_url:                practicesTable.logo_url,
          primary_color:           practicesTable.primary_color,
          white_label_primary_color: practicesTable.white_label_primary_color,
        }).from(practicesTable)
          .where(eq(practicesTable.id, referrer.practice_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  let office_name: string | null = null;
  if (officeRow) {
    const dash = officeRow.name.lastIndexOf("–");
    office_name = dash !== -1 ? officeRow.name.slice(dash + 2).trim() : officeRow.name;
  }

  const practice: PracticeInfo | null = practiceRow
    ? {
        id:           practiceRow.id,
        display_name: practiceRow.white_label_name ?? practiceRow.name,
        vertical:     practiceRow.vertical ?? "dental",
        logo_url:     practiceRow.white_label_logo_url ?? practiceRow.logo_url ?? null,
        primary_color: practiceRow.white_label_primary_color ?? practiceRow.primary_color ?? "E0622A",
      }
    : null;

  res.json({
    referrer_id:   referrer.id,
    referrer_name: referrer.name.split(" ")[0],
    referral_code: referrer.referral_code,
    office_name:   office_name ?? "Hallmark Dental",
    practice,
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
