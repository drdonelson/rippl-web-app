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
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendRewardNotification } from "./notifications";
import { matchReferrerByName } from "../lib/matchReferrer";
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
 */
async function findLatestBatch(
  sftp: InstanceType<typeof SftpClient>,
  remotePath: string,
): Promise<{ deal: string; customer: string; contact: string; sourceGroup: string } | null> {
  type SftpEntry = { name: string; type: string };
  const entries = await sftp.list(remotePath) as SftpEntry[];
  const csvFiles = entries
    .filter(f => f.type === "-" && f.name.endsWith(".csv"))
    .map(f => f.name);

  // Sort deal files descending (timestamp is the last segment so lexicographic = chronological)
  const dealFiles = csvFiles
    .filter(n => n.includes("_v2_deal_"))
    .sort()
    .reverse();

  if (dealFiles.length === 0) return null;

  const latestDeal = dealFiles[0];
  const nameParts  = latestDeal.replace(".csv", "").split("_");
  const timestamp  = nameParts[nameParts.length - 1];
  const storeNum   = nameParts[0];

  const find = (table: string) => {
    const hit = csvFiles.find(
      n => n.startsWith(`${storeNum}_v2_${table}_`) && n.endsWith(`_${timestamp}.csv`)
    );
    return hit ? `${remotePath.replace(/\/$/, "")}/${hit}` : null;
  };

  const customerPath    = find("customer");
  const contactPath     = find("customercontact");
  const sourceGroupPath = find("sourcedescriptiongroup");

  if (!customerPath || !contactPath || !sourceGroupPath) {
    logger.warn({ latestDeal, timestamp }, "[dc-sftp] Missing batch files alongside deal CSV");
    return null;
  }

  return {
    deal:        `${remotePath.replace(/\/$/, "")}/${latestDeal}`,
    customer:    customerPath,
    contact:     contactPath,
    sourceGroup: sourceGroupPath,
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
  referralsDetected: number;
  alreadyProcessed: number;
  unmatched: number;
  errors: string[];
}

export async function pollDriveCentricSftp(
  practiceId: string,
): Promise<DriveCentricSftpResult> {
  const result: DriveCentricSftpResult = {
    practiceId, dealsScanned: 0, deliveredDeals: 0,
    referralsDetected: 0, alreadyProcessed: 0, unmatched: 0, errors: [],
  };

  const [practice] = await db
    .select()
    .from(practicesTable)
    .where(eq(practicesTable.id, practiceId));

  if (!practice) { result.errors.push("Practice not found"); return result; }

  const cfg = (practice.integration_config ?? {}) as Record<string, string>;

  const sftpHost     = cfg["sftp_host"] ?? "";
  const sftpPort     = parseInt(cfg["sftp_port"] ?? "22", 10);
  const sftpUsername = cfg["sftp_username"] ?? "";
  const sftpPassword = cfg["sftp_password"];
  const sftpKey      = cfg["sftp_private_key"];
  const sftpPath     = cfg["sftp_path"] ?? "/";
  const groupsRaw    = cfg["referral_source_groups"] ?? "Customer Referral,Referral,Friend,Word of Mouth";
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

    const batch = await findLatestBatch(sftp, sftpPath);
    if (!batch) {
      result.errors.push("No export files found on SFTP server");
      return result;
    }

    logger.info({ batch }, "[dc-sftp] Downloading batch files");

    const [dealCsv, customerCsv, contactCsv, sourceGroupCsv] = await Promise.all([
      downloadText(sftp, batch.deal),
      downloadText(sftp, batch.customer),
      downloadText(sftp, batch.contact),
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

      try {
        // Dedup
        const [existing] = await db
          .select({ id: referralEventsTable.id })
          .from(referralEventsTable)
          .where(and(
            eq(referralEventsTable.external_proc_num, dealId),
            eq(referralEventsTable.practice_id, practiceId),
          ));
        if (existing) { result.alreadyProcessed++; continue; }

        // Is this a referral source group?
        const groupId   = deal["SourceDescriptionGroupId"];
        const groupName = groupId ? sourceGroups.get(groupId) : undefined;
        const isReferral = groupName
          ? referralGroups.some(r => groupName.includes(r))
          : false;

        if (!isReferral) continue;
        result.referralsDetected++;

        const referrerName = extractPersonName(deal["SourceDescription"] ?? "");
        const buyerCid     = deal["BuyerCustomerId"];
        const buyerName    = buyerCid ? (customers.get(buyerCid)?.name ?? "Unknown Customer") : "Unknown Customer";
        const buyerPhone   = buyerCid ? customerPhones.get(buyerCid)?.value : undefined;

        const matchResult = referrerName
          ? await matchReferrerByName(referrerName, practiceId, buyerPhone)
          : null;

        if (!matchResult) {
          result.unmatched++;
          await db.insert(adminTasksTable).values({
            task_type:   "unmatched-referral",
            practice_id: practiceId,
            notes: [
              `DriveCentric SFTP — deal ${dealId}.`,
              `Buyer: ${buyerName} (${buyerPhone ?? "no phone"}).`,
              `Source group: "${groupName ?? "unknown"}".`,
              `Source description: "${deal["SourceDescription"] ?? ""}".`,
              referrerName ? `Attempted name match: "${referrerName}".` : "No name found in description.",
            ].join(" "),
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
