import { db } from "@workspace/db";
import {
  referralEventsTable,
  referrersTable,
  rewardClaimsTable,
  adminTasksTable,
  practicesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendRewardNotification } from "./notifications";
import { matchReferrerByName } from "../lib/matchReferrer";
import { calculateTier } from "../lib/tierUtils";

const DC_API_BASE = "https://api.drivecentric.com/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DcSurveyResponse {
  question: string;
  answer: string;
}

interface DcDeal {
  id: string;
  status: string;           // "closed", "pending", etc.
  closedAt: string | null;
  customerName: string;
  customerPhone?: string;
  surveyResponses: DcSurveyResponse[];
}

interface DcDealsResponse {
  deals: DcDeal[];
  nextCursor?: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchClosedDeals(
  apiKey: string,
  dealerId: string,
  sinceIso: string,
): Promise<DcDeal[]> {
  const url = new URL(`${DC_API_BASE}/dealers/${dealerId}/deals`);
  url.searchParams.set("status", "closed");
  url.searchParams.set("since", sinceIso);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DriveCentric API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as DcDealsResponse;
  return data.deals ?? [];
}

/** Check whether we already processed this deal (dedup via external_proc_num). */
async function checkDealProcessed(dealId: string, practiceId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: referralEventsTable.id })
    .from(referralEventsTable)
    .where(
      and(
        eq(referralEventsTable.external_proc_num, dealId),
        eq(referralEventsTable.practice_id, practiceId),
      ),
    );
  return !!existing;
}

/**
 * Extract a referral name from survey responses.
 * Matches question text against the configured question (default: "How did you hear about us?")
 * and lead source tags (default: ["Customer Referral", "Friend", "Referral", "Word of Mouth"]).
 */
export function extractReferralFromSurvey(
  responses: DcSurveyResponse[],
  surveyQuestion: string,
  referralTags: string[],
): string | null {
  const qNorm = surveyQuestion.trim().toLowerCase();
  const tagsNorm = referralTags.map(t => t.trim().toLowerCase());

  for (const r of responses) {
    if (r.question.trim().toLowerCase() !== qNorm) continue;
    const answer = r.answer.trim();
    // If the answer exactly matches a referral lead source tag, it's a referral.
    if (tagsNorm.includes(answer.toLowerCase())) {
      // The answer is a tag value — the name isn't embedded here.
      // Return a sentinel so callers know this is a referral but must read customerName.
      return "__customer_referral__";
    }
    // If the answer looks like a person name (contains a space), treat it as the referrer name.
    if (answer.includes(" ")) return answer;
  }
  return null;
}

// ── Main poller ───────────────────────────────────────────────────────────────

export interface DriveCentricSyncResult {
  practiceId: string;
  dealsScanned: number;
  referralsDetected: number;
  alreadyProcessed: number;
  unmatched: number;
  errors: string[];
}

export async function pollDriveCentric(
  practiceId: string,
): Promise<DriveCentricSyncResult> {
  const result: DriveCentricSyncResult = {
    practiceId,
    dealsScanned: 0,
    referralsDetected: 0,
    alreadyProcessed: 0,
    unmatched: 0,
    errors: [],
  };

  // Load practice + integration config
  const [practice] = await db
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.id, practiceId));

  if (!practice) {
    result.errors.push("Practice not found");
    return result;
  }

  const config = (practice.integration_config ?? {}) as Record<string, string>;
  const apiKey   = config["drivecentic_api_key"] ?? "";
  const dealerId = config["dealer_id"] ?? "";
  const surveyQuestion    = config["survey_referral_question"] ?? "How did you hear about us?";
  const referralTagsRaw   = config["referral_lead_source_tags"] ?? "Customer Referral,Friend,Referral,Word of Mouth";
  const referralTags      = referralTagsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);

  if (!apiKey || !dealerId) {
    logger.warn({ practiceId }, "[drivecentric] Missing API key or dealer ID — skipping poll");
    return result;
  }

  // Poll last 24 hours by default
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let deals: DcDeal[];
  try {
    deals = await fetchClosedDeals(apiKey, dealerId, since);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`fetchClosedDeals failed: ${msg}`);
    logger.error({ err, practiceId }, "[drivecentric] fetchClosedDeals failed");
    return result;
  }

  result.dealsScanned = deals.length;

  for (const deal of deals) {
    try {
      const alreadyDone = await checkDealProcessed(deal.id, practiceId);
      if (alreadyDone) {
        result.alreadyProcessed++;
        continue;
      }

      const referralSignal = extractReferralFromSurvey(
        deal.surveyResponses ?? [],
        surveyQuestion,
        referralTags,
      );

      if (!referralSignal) continue;
      result.referralsDetected++;

      // Determine the name to match:
      // - If survey gave us a real name (contains space), use it.
      // - If sentinel, the survey says it's a referral but not who — we have no
      //   name to match, so create an unmatched task.
      const nameToMatch =
        referralSignal === "__customer_referral__" ? null : referralSignal;

      const matchResult = nameToMatch
        ? await matchReferrerByName(nameToMatch, practiceId, deal.customerPhone)
        : null;

      if (!matchResult) {
        result.unmatched++;
        await db.insert(adminTasksTable).values({
          task_type:   "unmatched-referral",
          practice_id: practiceId,
          notes:       `DriveCentric deal ${deal.id}: ${deal.customerName} reported a referral but name could not be matched. Raw name: "${nameToMatch ?? "(no name in survey)"}". Customer phone: ${deal.customerPhone ?? "none"}.`,
          status:      "pending",
        });
        logger.info({ dealId: deal.id, practiceId }, "[drivecentric] Unmatched referral — admin task created");
        continue;
      }

      const { referrer } = matchResult;

      const [newEvent] = await db.insert(referralEventsTable).values({
        new_patient_name:   deal.customerName,
        new_patient_phone:  deal.customerPhone ?? "",
        new_patient_pat_num: deal.id,
        referrer_id:        referrer.id,
        team_source:        "drivecentric-poll",
        office:             practice.name,
        office_id:          null,
        practice_id:        practiceId,
        external_proc_num:  deal.id,
        status:             "Exam Completed",
      }).returning();

      if (!newEvent) continue;

      const tierData = calculateTier(referrer.total_referrals + 1);

      // Update referrer totals + tier
      await db
        .update(referrersTable)
        .set({
          total_referrals: referrer.total_referrals + 1,
          tier:              tierData.name,
          tier_unlocked_at:  tierData.name !== referrer.tier ? new Date() : referrer.tier_unlocked_at,
          reward_value:      tierData.rewardValue,
        })
        .where(eq(referrersTable.id, referrer.id));

      const claimToken = crypto.randomUUID();
      await db.insert(rewardClaimsTable).values({
        claim_token:        claimToken,
        referral_event_id:  newEvent.id,
        referrer_id:        referrer.id,
        reward_value:       tierData.rewardValue,
        practice_id:        practiceId,
        status:             "pending",
      });

      sendRewardNotification(
        referrer.name,
        referrer.phone,
        referrer.email ?? null,
        newEvent.new_patient_name,
        claimToken,
        practice.name,
        tierData.rewardValue,
        practiceId,
      ).catch((err) => {
        logger.error({ err, dealId: deal.id }, "[drivecentric] Notification failed");
      });

      logger.info(
        { dealId: deal.id, referrerId: referrer.id, matchType: matchResult.matchType },
        "[drivecentric] Referral processed",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Deal ${deal.id}: ${msg}`);
      logger.error({ err, dealId: deal.id }, "[drivecentric] Error processing deal");
    }
  }

  return result;
}
