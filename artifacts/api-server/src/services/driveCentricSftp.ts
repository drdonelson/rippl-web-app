/**
 * DriveCentric SFTP integration — v2 data export format
 *
 * DriveCentric exports daily CSV files to a dealer-provided SFTP server.
 * File naming: {storeNum}_v2_{table}_{dateFrom}_{dateTo}_{timestamp}.csv
 *
 * Referral trigger: Deal.Status = "Delivered" + SourceDescriptionGroup.Name
 * matches a configured referral group (e.g. "Customer Referral").
 * Referrer name is extracted from Deal.SourceDescription when it looks like
 * a person name (2-4 capitalized words, no vendor-like separators).
 *
 * The REST API approach (driveCentric.ts) is preserved for future use if
 * DriveCentric provides a direct API.
 */

import { db } from "@workspace/db";
import {
  referralEventsTable,
  referrersTable,
  rewardClaimsTable,
  adminTasksTable,
  practicesTable,
  preReferralsTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendRewardNotification } from "./notifications";
import { matchReferrerByName, matchReferrerByCode } from "../lib/matchReferrer";
import { sendAutomotiveOnboardingSms } from "./onboardingSms";
import { calculateTier } from "../lib/tierUtils";
// @ts-ignore — ssh2-sftp-client ships CJS; ssh2 is externalised in esbuild config
import SftpClient from "ssh2-sftp-client";

// ── CSV parser (RFC 4180) ─────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      result.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { result.push(line.slice(i)); break; }
      result.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return result;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter(l => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    if (vals.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

// ── SFTP helpers ──────────────────────────────────────────────────────────────

async function connectSftp(config: {
  host: string; port: number; username: string;
  password?: string; privateKey?: string;
}): Promise<InstanceType<typeof SftpClient>> {
  const client = new SftpClient();
  await client.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    ...(config.password    ? { password: config.password }       : {}),
    ...(config.privateKey  ? { privateKey: config.privateKey }   : {}),
    readyTimeout: 20000,
  });
  return client;
}

async function downloadText(
  sftp: InstanceType<typeof SftpClient>,
  remotePath: string,
): Promise<string> {
  const buffer = await sftp.get(remotePath) as Buffer;
  return buffer.toString("utf-8");
}

/**
 * Find the latest export batch on the SFTP server.
 * Returns paths to deal, customer, customercontact, and sourcedescriptiongroup CSVs
 * that share the same {storeNum}_{timestamp} batch identifier.
 *
 * storeNumFilter: when set, only processes files whose store number prefix matches.
 * This prevents wrong-store files from being processed if DriveCentric accidentally
 * deposits multiple stores' files into the same SFTP directory.
 */
async function findLatestBatch(
  sftp: InstanceType<typeof SftpClient>,
  remotePath: string,
  storeNumFilter?: string,
): Promise<{ deal: string; customer: string | null; contact: string | null; sourceGroup: string; storeNum: string } | null> {
  type SftpEntry = { name: string; type: string };
  const entries = await sftp.list(remotePath) as SftpEntry[];
  const csvFiles = entries
    .filter(f => f.type === "-" && f.name.endsWith(".csv"))
    .map(f => f.name);

  // Sort deal files descending (timestamp is the last segment so lexicographic = chronological)
  // If storeNumFilter is configured, discard files from any other store number.
  const dealFiles = csvFiles
    .filter(n => {
      if (!n.includes("_v2_deal_")) return false;
      if (storeNumFilter && !n.startsWith(`${storeNumFilter}_`)) return false;
      return true;
    })
    .sort()
    .reverse();

  if (dealFiles.length === 0) {
    if (storeNumFilter) {
      logger.warn({ remotePath, storeNumFilter }, "[dc-sftp] No deal files found for expected store number — directory may contain wrong-store files");
    }
    return null;
  }

  const latestDeal = dealFiles[0];
  const nameParts  = latestDeal.replace(".csv", "").split("_");
  const timestamp  = nameParts[nameParts.length - 1];
  const storeNum   = nameParts[0];

  if (storeNumFilter && storeNum !== storeNumFilter) {
    logger.error({ storeNum, storeNumFilter, latestDeal }, "[dc-sftp] Store number mismatch — skipping batch to prevent wrong-practice attribution");
    return null;
  }

  const find = (table: string) => {
    const hit = csvFiles.find(
      n => n.startsWith(`${storeNum}_v2_${table}_`) && n.endsWith(`_${timestamp}.csv`)
    );
    return hit ? `${remotePath.replace(/\/$/, "")}/${hit}` : null;
  };

  const customerPath    = find("customer");
  const contactPath     = find("customercontact");
  const sourceGroupPath = find("sourcedescriptiongroup");

  if (!sourceGroupPath) {
    logger.warn({ latestDeal, timestamp }, "[dc-sftp] Missing sourcedescriptiongroup CSV — cannot process batch");
    return null;
  }

  if (!customerPath || !contactPath) {
    logger.warn({ latestDeal, timestamp }, "[dc-sftp] Missing customer/contact CSVs — buyer name/phone will be unknown");
  }

  return {
    deal:        `${remotePath.replace(/\/$/, "")}/${latestDeal}`,
    customer:    customerPath,
    contact:     contactPath,
    sourceGroup: sourceGroupPath,
    storeNum,
  };
}

// ── Referral detection ────────────────────────────────────────────────────────

const PHONE_PRIORITY: Record<string, number> = { Mobile: 0, Home: 1, Work: 2 };

/**
 * Decide if SourceDescription looks like a person name rather than a vendor tag.
 * Person heuristic: 2–4 space-separated tokens, no digits, no vendor separators (/ – | , ).
 */
function extractPersonName(description: string): string | null {
  const d = description.trim();
  if (!d) return null;
  if (/[\/\-–|,]/.test(d)) return null;  // vendor-style separators
  if (/\d/.test(d)) return null;           // contains digits
  // Reject category labels that would pass the name heuristic (e.g. "Customer Referral")
  if (/referral|networking|campaign|drive|relationship|internet|showroom/i.test(d)) return null;
  const tokens = d.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return null;
  if (!/^[A-Z]/.test(tokens[0])) return null;  // first word must be capitalised
  return d;
}

// ── Main poller ───────────────────────────────────────────────────────────────

export interface DriveCentricSftpResult {
  practiceId: string;
  dealsScanned: number;
  deliveredDeals: number;
  enrolledBuyers: number;
  referralsDetected: number;
  alreadyProcessed: number;
  unmatched: number;
  errors: string[];
}

function generateReferralCode(name: string): string {
  const clean = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rand}`;
}

export async function pollDriveCentricSftp(
  practiceId: string,
): Promise<DriveCentricSftpResult> {
  const result: DriveCentricSftpResult = {
    practiceId, dealsScanned: 0, deliveredDeals: 0, enrolledBuyers: 0,
    referralsDetected: 0, alreadyProcessed: 0, unmatched: 0, errors: [],
  };

  const [practice] = await db
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.id, practiceId));

  if (!practice) { result.errors.push("Practice not found"); return result; }

  const cfg = (practice.integration_config ?? {}) as Record<string, string>;

  const sftpHost       = cfg["sftp_host"] ?? "";
  const sftpPort       = parseInt(cfg["sftp_port"] ?? "22", 10);
  const sftpUsername   = cfg["sftp_username"] ?? "";
  const sftpPassword   = cfg["sftp_password"];
  const sftpKey        = cfg["sftp_private_key"];
  const sftpPath       = cfg["sftp_path"] ?? "/";
  // sftp_store_num: expected DriveCentric store number (e.g. "3364" for Carlock, "3367" for Volvo).
  // When set, only files whose filename prefix matches are processed — prevents wrong-store
  // attribution if DriveCentric accidentally deposits multiple stores' files in one directory.
  const storeNumFilter = cfg["sftp_store_num"] ?? undefined;
  const groupsRaw      = cfg["referral_source_groups"] ?? "Customer Referral,Referral,Friend,Word of Mouth";
  const referralGroups = groupsRaw.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);

  if (!sftpHost || !sftpUsername) {
    logger.warn({ practiceId }, "[dc-sftp] Missing SFTP host/username — skipping");
    return result;
  }

  let sftp: InstanceType<typeof SftpClient> | null = null;

  try {
    sftp = await connectSftp({
      host: sftpHost, port: sftpPort, username: sftpUsername,
      password: sftpPassword, privateKey: sftpKey,
    });

    const batch = await findLatestBatch(sftp, sftpPath, storeNumFilter);
    if (!batch) {
      result.errors.push("No export files found on SFTP server");
      return result;
    }

    logger.info({ batch }, "[dc-sftp] Downloading batch files");

    const [dealCsv, customerCsv, contactCsv, sourceGroupCsv] = await Promise.all([
      downloadText(sftp, batch.deal),
      batch.customer ? downloadText(sftp, batch.customer) : Promise.resolve(""),
      batch.contact  ? downloadText(sftp, batch.contact)  : Promise.resolve(""),
      downloadText(sftp, batch.sourceGroup),
    ]);

    // ── Build lookup maps ─────────────────────────────────────────────────────

    const sourceGroups = new Map<string, string>(
      parseCsv(sourceGroupCsv)
        .filter(r => r["IsDeleted"] !== "1")
        .map(r => [r["SourceDescriptionGroupId"], r["Name"].toLowerCase()])
    );

    const customers = new Map<string, { name: string }>(
      parseCsv(customerCsv)
        .filter(r => r["IsDeleted"] !== "1")
        .map(r => [
          r["CustomerId"],
          { name: `${r["FirstName"]} ${r["LastName"]}`.trim() },
        ])
    );

    // Best phone per customer (Mobile > Home > Work)
    const customerPhones = new Map<string, { label: string; value: string }>();
    for (const row of parseCsv(contactCsv)) {
      if (row["IsDeleted"] === "1" || row["IsBad"] === "1") continue;
      if (row["Type"] !== "Phone") continue;
      const cid     = row["CustomerId"];
      const label   = row["Label"] ?? "Work";
      const current = customerPhones.get(cid);
      if (!current || (PHONE_PRIORITY[label] ?? 99) < (PHONE_PRIORITY[current.label] ?? 99)) {
        customerPhones.set(cid, { label, value: row["Value"] });
      }
    }

    // ── Process deals ─────────────────────────────────────────────────────────

    const deals = parseCsv(dealCsv);
    result.dealsScanned = deals.length;

    for (const deal of deals) {
      if (deal["Status"] !== "Delivered")  continue;
      if (deal["IsDeleted"]   === "1")     continue;
      if (deal["IsDuplicate"] === "1")     continue;
      result.deliveredDeals++;

      const dealId = deal["DealId"];
      const buyerCid   = deal["BuyerCustomerId"];
      const buyerName  = buyerCid ? (customers.get(buyerCid)?.name ?? "Unknown Customer") : "Unknown Customer";
      const buyerPhone = buyerCid ? customerPhones.get(buyerCid)?.value : undefined;

      try {
        // Auto-enroll buyer as a Carlock Rewards member if not already enrolled
        if (buyerName !== "Unknown Customer" && buyerPhone) {
          const phoneLast10 = buyerPhone.replace(/\D/g, "").slice(-10);
          const [existingReferrer] = await db
            .select({ id: referrersTable.id })
            .from(referrersTable)
            .where(and(
              eq(referrersTable.practice_id, practiceId),
              sql`RIGHT(REGEXP_REPLACE(${referrersTable.phone}, '[^0-9]', '', 'g'), 10) = ${phoneLast10}`,
            ));

          if (!existingReferrer) {
            const referralCode = generateReferralCode(buyerName);
            await db.insert(referrersTable).values({
              practice_id:   practiceId,
              patient_id:    `dc-${dealId}`,
              name:          buyerName,
              phone:         phoneLast10,
              referral_code: referralCode,
              sms_opt_out:   false,
              reward_value:  practice.reward_value ?? 100,
              tier:          "starter",
            });
            result.enrolledBuyers++;

            const firstName = buyerName.split(/\s+/)[0] ?? "there";
            const brandName = (practice as any).white_label_name ?? practice.name;
            sendAutomotiveOnboardingSms({ firstName, phone: phoneLast10, referralCode, brandName })
              .catch(err => logger.warn({ err, dealId }, "[dc-sftp] Onboarding SMS failed — referrer still enrolled"));

            logger.info({ dealId, buyerName, referralCode }, "[dc-sftp] Buyer auto-enrolled");
          }
        }

        // Dedup
        const [existing] = await db
          .select({ id: referralEventsTable.id })
          .from(referralEventsTable)
          .where(and(
            eq(referralEventsTable.external_proc_num, dealId),
            eq(referralEventsTable.practice_id, practiceId),
          ));
        if (existing) { result.alreadyProcessed++; continue; }

        // Is this a referral? Primary: SourceDescriptionGroupId → group name match.
        // Fallback: some dealers encode the category directly in SourceDescription
        // (no group configured), so also check the description text itself.
        const groupId     = deal["SourceDescriptionGroupId"];
        const groupName   = groupId ? sourceGroups.get(groupId) : undefined;
        const descLower   = (deal["SourceDescription"] ?? "").toLowerCase();

        const isReferralByGroup = groupName
          ? referralGroups.some(r => groupName.includes(r))
          : false;
        const isReferralByDesc  = !groupId
          ? referralGroups.some(r => descLower.includes(r))
          : false;

        const isReferral = isReferralByGroup || isReferralByDesc;
        if (!isReferral) continue;
        result.referralsDetected++;

        const rawDesc  = deal["SourceDescription"] ?? "";

        // Three-tier attribution (only attempted when group-based detection fired,
        // since description-only deals have no referrer info in the description).
        //   Tier 1: referral code exact lookup  (salesperson entered "MIKEX7K2")
        //   Tier 2: person name fuzzy match     (salesperson entered "John Smith")
        //   Tier 3: admin task for manual resolution
        let matchResult = null;
        let referrerName: string | null = null;

        if (isReferralByGroup) {
          matchResult = await matchReferrerByCode(rawDesc, practiceId);
          if (!matchResult) {
            referrerName = extractPersonName(rawDesc);
            if (referrerName) {
              matchResult = await matchReferrerByName(referrerName, practiceId, buyerPhone);
            }
          }
        }

        // Tier 0: pre-referral link click — buyer clicked referral link before visiting
        if (!matchResult && buyerPhone) {
          const phoneLast10 = buyerPhone.replace(/\D/g, "").slice(-10);
          const [preReferralRow] = await db
            .select({ id: preReferralsTable.id, referral_code: preReferralsTable.referral_code })
            .from(preReferralsTable)
            .where(and(
              eq(preReferralsTable.practice_id, practiceId),
              eq(preReferralsTable.phone, phoneLast10),
              eq(preReferralsTable.matched, "no"),
            ));

          if (preReferralRow) {
            matchResult = await matchReferrerByCode(preReferralRow.referral_code, practiceId);
            if (matchResult) {
              await db.update(preReferralsTable)
                .set({ matched: "yes" })
                .where(eq(preReferralsTable.id, preReferralRow.id));
              logger.info({ dealId, referralCode: preReferralRow.referral_code }, "[dc-sftp] Matched via pre-referral link click");
            }
          }
        }

        if (!matchResult) {
          result.unmatched++;
          await db.insert(adminTasksTable).values({
            task_type:   "unmatched-referral",
            practice_id: practiceId,
            notes: [
              `DriveCentric SFTP — deal ${dealId}.`,
              `Buyer: ${buyerName} (${buyerPhone ?? "no phone"}).`,
              `Source group: "${groupName ?? "unknown"}".`,
              `Source description: "${rawDesc}".`,
              isReferralByDesc ? "Detected via description keyword (no source group configured)." : "",
              referrerName ? `Attempted name match: "${referrerName}".` : "No referrer name or code in description.",
            ].filter(Boolean).join(" "),
            status: "pending",
          });
          logger.info({ dealId, practiceId, referrerName }, "[dc-sftp] Unmatched referral — admin task created");
          continue;
        }

        const { referrer } = matchResult;

        const [newEvent] = await db.insert(referralEventsTable).values({
          new_patient_name:    buyerName,
          new_patient_phone:   buyerPhone ?? "",
          new_patient_pat_num: dealId,
          referrer_id:         referrer.id,
          team_source:         "drivecentric-sftp",
          office:              practice.name,
          office_id:           null,
          practice_id:         practiceId,
          external_proc_num:   dealId,
          status:              "Completed",
        }).returning();

        if (!newEvent) continue;

        const tierData = calculateTier(referrer.total_referrals + 1);

        await db.update(referrersTable).set({
          total_referrals:  referrer.total_referrals + 1,
          tier:             tierData.name,
          tier_unlocked_at: tierData.name !== referrer.tier ? new Date() : referrer.tier_unlocked_at,
          reward_value:     tierData.rewardValue,
        }).where(eq(referrersTable.id, referrer.id));

        const claimToken = crypto.randomUUID();
        await db.insert(rewardClaimsTable).values({
          claim_token:       claimToken,
          referral_event_id: newEvent.id,
          referrer_id:       referrer.id,
          reward_value:      tierData.rewardValue,
          practice_id:       practiceId,
          status:            "pending",
        });

        sendRewardNotification(
          referrer.name, referrer.phone, referrer.email ?? null,
          buyerName, claimToken, practice.name, tierData.rewardValue, practiceId,
        ).catch(err => logger.error({ err, dealId }, "[dc-sftp] Notification failed"));

        logger.info(
          { dealId, referrerId: referrer.id, matchType: matchResult.matchType },
          "[dc-sftp] Referral processed",
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Deal ${dealId}: ${msg}`);
        logger.error({ err, dealId }, "[dc-sftp] Error processing deal");
      }
    }
  } finally {
    await sftp?.end().catch(() => {});
  }

  return result;
}
