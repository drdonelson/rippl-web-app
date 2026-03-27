import { Router, type IRouter } from "express";
import healthRouter from "./health";
import referrersRouter from "./referrers";
import referralsRouter from "./referrals";
import rewardsRouter from "./rewards";
import dashboardRouter from "./dashboard";
import testRouter from "./test";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/referrers", referrersRouter);
router.use("/referrals", referralsRouter);
router.use("/rewards", rewardsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/test", testRouter);

export default router;
