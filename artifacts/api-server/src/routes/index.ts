import { Router, type IRouter } from "express";
import healthRouter from "./health";
import referrersRouter from "./referrers";
import referralsRouter from "./referrals";
import rewardsRouter from "./rewards";
import dashboardRouter from "./dashboard";
import testRouter from "./test";
import syncRouter from "./sync";
import adminTasksRouter from "./adminTasks";
import launchRouter from "./launch";
import openDentalRouter from "./openDental";
import officesRouter from "./offices";
import authRouter from "./auth";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// Always-public routes
router.use(healthRouter);
router.use("/launch", launchRouter);
router.use("/auth", authRouter);
router.use("/test", testRouter);

// Semi-public routes (non-sensitive data)
router.use("/offices", officesRouter);

// Protected routes — require valid Supabase session
router.use("/referrers", requireAuth, referrersRouter);
router.use("/referrals", requireAuth, referralsRouter);
router.use("/rewards", requireAuth, rewardsRouter);
router.use("/dashboard", requireAuth, dashboardRouter);
router.use("/sync", requireAuth, syncRouter);
router.use("/admin-tasks", requireAuth, adminTasksRouter);
router.use("/opendental", requireAuth, openDentalRouter);

export default router;
