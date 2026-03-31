import { Router, type IRouter } from "express";
import { syncOpenDental } from "../services/openDentalPoller";

const router: IRouter = Router();

// POST /api/sync/opendental — manually trigger an Open Dental sync
// Hits GET /api/v1/procedurelogs with auth ODFHIR {DeveloperKey}/{CustomerKey},
// filters client-side for procCode=REF-COMP + ProcStatus=C, and for each new
// completion: inserts a referral_event with status "Exam Completed" and fires
// the reward notification to the referring patient.
router.post("/opendental", async (req, res) => {
  const force = req.body?.force === true;
  req.log.info({ force }, "Manual Open Dental sync triggered");

  const result = await syncOpenDental({ force });

  const hasErrors = result.errors.length > 0;
  const status = hasErrors && result.od_total === 0 ? 503 : 200;

  res.status(status).json({
    method:   "POST",
    endpoint: "/api/sync/opendental",
    force,
    success:  status === 200,
    od_total:         result.od_total,
    ref_comp_found:   result.fetched,
    ref_comp_new:     result.inserted,
    ref_comp_skipped: result.skipped,
    errors:   result.errors,
    message:  result.fetched === 0
      ? `No REF-COMP completions found (${result.od_total} total completed procedures checked).`
      : `Found ${result.fetched} REF-COMP completion(s) — ${result.inserted} new referral event(s) created, ${result.skipped} already synced.${force ? " [force mode]" : ""}`,
  });
});

export default router;
