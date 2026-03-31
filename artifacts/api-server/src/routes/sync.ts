import { Router, type IRouter } from "express";
import { syncAllOffices } from "../services/openDentalPoller";

const router: IRouter = Router();

// POST /api/sync/opendental — manually trigger an Open Dental sync across all active offices
router.post("/opendental", async (req, res) => {
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
      ? `No REF-COMP completions found across ${results.length} office(s) (${totals.od_total} total procedures checked).`
      : `Found ${totals.fetched} REF-COMP completion(s) — ${totals.inserted} new event(s) created, ${totals.skipped} already synced, ${totals.unmatched} unmatched.${force ? " [force mode]" : ""}`,
    ...(force ? { per_office: results.map(r => ({ ...r })) } : {}),
  });
});

export default router;
