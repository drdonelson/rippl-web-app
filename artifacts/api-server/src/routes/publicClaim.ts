import { Router, type IRouter, type RequestHandler } from "express";
import { db } from "@workspace/db";
import {
  rewardClaimsTable,
  referralEventsTable,
  referrersTable,
  localPartnersTable,
  officesTable,
  practicesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { redeemReward, assertClaimable, assertTenant, RewardError } from "../services/rewardRedemption";

const router: IRouter = Router();

// Tokens used for the demo claim preview link in the admin sidebar.
// Claims made with these tokens skip all real side-effects and auto-reset
// to "pending" after 60 seconds so the next demo visitor can use it.
const DEMO_TOKEN      = "demo-claim-preview-token-screenshot";
const DEMO_TOKEN_AUTO = "demo-claim-preview-token-auto";


// ── GET /api/claim/by-token/:token ────────────────────────────────────────────
// Validate a claim token and return everything needed to render the reward page.
// No auth — patients open this from their phone without a Rippl account.
export const getClaim: RequestHandler = async (req, res) => {
  const { token } = req.params;

  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  // Demo tokens: return fake data so the Patient Journey preview works without a real DB record
  if (token === DEMO_TOKEN) {
    res.json({
      claim:       { id: "demo", reward_value: 35, expires_at: null, claimed_at: null, status: "pending" },
      referrer:    { id: "demo", name: "Sarah Johnson", tier: "starter", total_referrals: 1, reward_value: 35, referral_code: "SARAHJ" },
      referral:    { id: "demo", new_patient_name: "James Wilson", office: "Hallmark Dental – Brentwood", office_id: null, office_logo_url: null },
      localPartner: null,
      practice:    { name: "Hallmark Dental", vertical: "dental", white_label_name: null, white_label_logo_url: null, white_label_primary_color: null, show_powered_by_rippl: true, in_house_credit_label: "$100 Dental Account Credit", in_house_credit_value: 100, custom_rewards: null },
    });
    return;
  }
  if (token === DEMO_TOKEN_AUTO) {
    res.json({
      claim:       { id: "demo-auto", reward_value: 100, expires_at: null, claimed_at: null, status: "pending" },
      referrer:    { id: "demo-auto", name: "Carlos Mendez", tier: "starter", total_referrals: 1, reward_value: 100, referral_code: "CARLOSM" },
      referral:    { id: "demo-auto", new_patient_name: "Marcus Thompson", office: "Volvo of Cool Springs", office_id: null, office_logo_url: null },
      localPartner: null,
      practice:    { name: "Volvo of Cool Springs", vertical: "automotive", white_label_name: "Carlock Rewards", white_label_logo_url: null, white_label_primary_color: null, show_powered_by_rippl: true, in_house_credit_label: null, in_house_credit_value: null, custom_rewards: null },
    });
    return;
  }

  const [claim] = await db
    .select()
    .from(rewardClaimsTable)
    .where(eq(rewardClaimsTable.claim_token, token));

  if (!claim) {
    res.status(404).json({ error: "invalid" });
    return;
  }

  try {
    assertTenant(claim.practice_id, req.authUser);
    assertClaimable(claim);
  } catch (err) {
    if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; }
    throw err;
  }

  const [referrer, referral] = await Promise.all([
    db.select().from(referrersTable)
      .where(eq(referrersTable.id, claim.referrer_id!))
      .then(r => r[0] ?? null),
    claim.referral_event_id
      ? db.select().from(referralEventsTable)
          .where(eq(referralEventsTable.id, claim.referral_event_id))
          .then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  if (!referrer || referrer.practice_id !== claim.practice_id ||
      (claim.referral_event_id && (!referral || referral.practice_id !== claim.practice_id || referral.referrer_id !== referrer.id))) {
    res.status(409).json({ error: "Referral ownership requires review" }); return;
  }

  let localPartner = null;
  let officeLogo: string | null = null;
  const officeId = referral?.office_id ?? null;
  const practiceId = claim.practice_id ?? referral?.practice_id ?? null;

  const [officeData, practiceData] = await Promise.all([
    officeId
      ? Promise.all([
          db.select().from(localPartnersTable)
            .where(and(eq(localPartnersTable.office_id, officeId), eq(localPartnersTable.active, true)))
            .limit(1).then(r => r[0] ?? null),
          db.select({ logo_url: officesTable.logo_url }).from(officesTable)
            .where(eq(officesTable.id, officeId)).limit(1).then(r => r[0] ?? null),
        ])
      : Promise.resolve([null, null]),
    practiceId
      ? db.select({
          name:                    practicesTable.name,
          vertical:                practicesTable.vertical,
          white_label_name:        practicesTable.white_label_name,
          white_label_logo_url:    practicesTable.white_label_logo_url,
          white_label_primary_color: practicesTable.white_label_primary_color,
          show_powered_by_rippl:   practicesTable.show_powered_by_rippl,
          in_house_credit_label:   practicesTable.in_house_credit_label,
          in_house_credit_value:   practicesTable.in_house_credit_value,
          integration_config:      practicesTable.integration_config,
        })
        .from(practicesTable).where(eq(practicesTable.id, practiceId)).limit(1)
        .then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  // Read the office row defensively rather than destructuring it. The `= { logo_url: null }`
  // default only applies to `undefined`, but both branches above yield `null` here (either
  // `r[0] ?? null` or the `[null, null]` no-office case) — so destructuring threw
  // "Cannot destructure property 'logo_url' of 'null'" and returned 500 on a public page
  // for any claim whose event has no resolvable office.
  const [partnerRow, officeRow] = officeData as unknown as [typeof localPartner, { logo_url: string | null } | null];
  localPartner = partnerRow ?? null;
  officeLogo   = officeRow?.logo_url ?? null;

  res.json({
    claim,
    referrer,
    referral: { ...referral, office_logo_url: officeLogo },
    localPartner,
    practice: practiceData,
  });
};

export const redeemClaim: RequestHandler = async (req, res) => {
  const { token, reward_type, gift_card_brand } = req.body ?? {};
  if (typeof token !== "string" || typeof reward_type !== "string" ||
      (gift_card_brand !== undefined && typeof gift_card_brand !== "string")) {
    res.status(400).json({ error: "token and reward_type are required" }); return;
  }
  if (token === DEMO_TOKEN || token === DEMO_TOKEN_AUTO) {
    res.json({ success: true, reward_type, reward_value: token === DEMO_TOKEN_AUTO ? 100 : 35,
      pin_code: reward_type === "local-partner" ? "1234" : null, tango_order_id: null,
      admin_task_created: false, referral_code: token === DEMO_TOKEN_AUTO ? "CARLOSM" : "SARAHJ" }); return;
  }
  try {
    const result = await redeemReward({ token, reward_type, gift_card_brand }, req.authUser);
    res.status(result.success ? 200 : 409).json(result);
  } catch (err) {
    if (err instanceof RewardError) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err }, "Redemption failed; inspect durable reconciliation task before retrying fulfilment");
    res.status(503).json({ error: "Reward processing interrupted. Contact support before requesting another reward." });
  }
};

router.get("/by-token/:token", getClaim);
router.post("/", redeemClaim);
export default router;
