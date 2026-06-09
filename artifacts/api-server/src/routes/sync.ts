import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { syncAllOffices } from "../services/openDentalPoller";
import { pollDriveCentricSftp } from "../services/driveCentricSftp";
import { requireAuth } from "../middleware/auth";
import { db } from "@workspace/db";
import { practicesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Dual-auth: accept either X-Sync-Secret header OR a valid Supabase Bearer token.
// This lets automated scripts (cron, Render deploy hooks, etc.) call the sync
// endpoint without a user session, while still protecting it from anonymous access.
function requireSyncAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SYNC_SECRET;
  const provided = req.headers["x-sync-secret"];

  if (secret && provided && provided === secret) {
    // Secret-key path — skip Supabase auth entirely
    return next();
  }

  if (!secret) {
    req.log?.warn("SYNC_SECRET is not configured — falling back to Supabase auth only");
  }

  // Fall through to standard Supabase Bearer-token auth
  requireAuth(req, res, next);
}

// POST /api/sync/opendental — manually trigger an Open Dental sync across all active offices
router.post("/opendental", requireSyncAuth, async (req, res) => {
  const force = req.body?.force === true;
  req.log.info({ force }, "Manual Open Dental sync triggered");

  const results = await syncAllOffices({ force });

  // Aggregate totals across all offices
  const totals = results.reduce(
    (acc, r) => ({
      od_total:   acc.od_total   + r.od_total,
      fetched:    acc.fetched    + r.fetched,
      inserted:   acc.inserted   + r.inserted,
      skipped:    acc.skipped    + r.skipped,
      unmatched:  acc.unmatched  + r.unmatched,
      errors:     [...acc.errors, ...r.errors],
    }),
    { od_total: 0, fetched: 0, inserted: 0, skipped: 0, unmatched: 0, errors: [] as string[] }
  );

  const hasErrors = totals.errors.length > 0;
  const status = hasErrors && totals.od_total === 0 ? 503 : 200;

  res.status(status).json({
    method:   "POST",
    endpoint: "/api/sync/opendental",
    force,
    success:  status === 200,
    offices_synced:        results.length,
    od_total:              totals.od_total,
    ref_comp_found:        totals.fetched,
    ref_comp_new:          totals.inserted,
    ref_comp_skipped:      totals.skipped,
    ref_comp_unmatched:    totals.unmatched,
    errors:   totals.errors,
    message:  totals.fetched === 0
      ? `No R0150 (REF-COMP) completions found across ${results.length} office(s) (${totals.od_total} total procedures checked).`
      : `Found ${totals.fetched} R0150 (REF-COMP) completion(s) — ${totals.inserted} new event(s) created, ${totals.skipped} already synced, ${totals.unmatched} unmatched.${force ? " [force mode]" : ""}`,
    ...(force ? { per_office: results.map(r => ({ ...r })) } : {}),
  });
});

// POST /api/sync/drivecentric — run the SFTP export poller for one or all automotive practices
// Body: { practice_id?: string }  — omit to run all practices with sftp_host configured
router.post("/drivecentric", requireSyncAuth, async (req, res) => {
  const { practice_id } = (req.body ?? {}) as { practice_id?: string };

  let practiceIds: string[] = [];

  if (practice_id) {
    practiceIds = [practice_id];
  } else {
    // Find all automotive practices that have sftp_host configured
    const practices = await db
      .select({ id: practicesTable.id, cfg: practicesTable.integration_config })
      .from(practicesTable)
      .where(eq(practicesTable.vertical, "automotive"));
    practiceIds = practices
      .filter(p => !!(p.cfg as Record<string, string>)?.["sftp_host"])
      .map(p => p.id);
  }

  if (practiceIds.length === 0) {
    res.json({ success: false, message: "No automotive practices with SFTP configured" });
    return;
  }

  req.log.info({ practiceIds }, "[sync] DriveCentric SFTP sync triggered");

  const results = await Promise.all(practiceIds.map(id => pollDriveCentricSftp(id)));

  const totals = results.reduce(
    (acc, r) => ({
      dealsScanned:       acc.dealsScanned       + r.dealsScanned,
      deliveredDeals:     acc.deliveredDeals     + r.deliveredDeals,
      referralsDetected:  acc.referralsDetected  + r.referralsDetected,
      alreadyProcessed:   acc.alreadyProcessed   + r.alreadyProcessed,
      unmatched:          acc.unmatched          + r.unmatched,
      errors:             [...acc.errors,         ...r.errors],
    }),
    { dealsScanned: 0, deliveredDeals: 0, referralsDetected: 0, alreadyProcessed: 0, unmatched: 0, errors: [] as string[] }
  );

  res.json({
    success:            totals.errors.length === 0,
    practices_synced:   results.length,
    deals_scanned:      totals.dealsScanned,
    delivered_deals:    totals.deliveredDeals,
    referrals_detected: totals.referralsDetected,
    already_processed:  totals.alreadyProcessed,
    unmatched:          totals.unmatched,
    errors:             totals.errors,
    per_practice:       results,
  });
});

export default router;
