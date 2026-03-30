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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/referrers", referrersRouter);
router.use("/referrals", referralsRouter);
router.use("/rewards", rewardsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/test", testRouter);
router.use("/sync", syncRouter);
router.use("/admin-tasks", adminTasksRouter);
router.use("/launch", launchRouter);

export default router;
