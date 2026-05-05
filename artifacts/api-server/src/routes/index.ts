import { Router, type IRouter } from "express";
import healthRouter from "./health";
import referrersRouter from "./referrers";
import referralsRouter from "./referrals";
import rewardsRouter from "./rewards";
import dashboardRouter from "./dashboard";
import testRouter from "./test";
import syncRouter from "./sync";
import adminTasksRouter from "./adminTasks";
import campaignsRouter from "./campaigns";
import launchRouter from "./launch";
import openDentalRouter from "./openDental";
import officesRouter from "./offices";
import authRouter from "./auth";
import importJobsRouter from "./importJobs";
import referralRouter from "./referral";
import publicClaimRouter from "./publicClaim";
import publicLookupRouter from "./publicLookup";
import waitlistRouter from "./waitlist";
import demoRouter from "./demo";
import backfillRouter from "./backfill";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// Always-public routes
router.use(healthRouter);
router.use("/launch", launchRouter);
router.use("/auth", authRouter);
router.use("/test", testRouter);
router.use("/referral", referralRouter);
router.use("/claim", publicClaimRouter);
router.use("/public", publicLookupRouter);
router.use("/public", waitlistRouter);
router.use("/admin", requireAuth, waitlistRouter);
router.use("/demo", demoRouter);

// Semi-public routes (non-sensitive data)
router.use("/offices", officesRouter);

// Protected routes — require valid Supabase session
router.use("/referrers", requireAuth, referrersRouter);
router.use("/referrals", requireAuth, referralsRouter);
router.use("/rewards", requireAuth, rewardsRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/sync", syncRouter);
router.use("/admin-tasks", requireAuth, adminTasksRouter);
router.use("/campaigns",   requireAuth, campaignsRouter);
router.use("/opendental", requireAuth, openDentalRouter);
router.use("/import", requireAuth, importJobsRouter);
router.use("/backfill", requireAuth, backfillRouter);

export default router;
