import { Router, type IRouter } from "express";
import { syncOpenDental } from "../services/openDentalPoller";

const router: IRouter = Router();

// POST /api/sync/opendental — manually trigger an Open Dental sync
router.post("/opendental", async (req, res) => {
  req.log.info("Manual Open Dental sync triggered");

  const result = await syncOpenDental();

  const status = result.errors.length > 0 && result.fetched === 0 ? 503 : 200;
  res.status(status).json({
    success: status === 200,
    ...result,
    message: `Synced ${result.inserted} new record(s). ${result.skipped} skipped. ${result.errors.length} error(s).`,
  });
});

export default router;
