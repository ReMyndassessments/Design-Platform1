import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import assessmentToolsRouter from "./assessmentTools";
import assignmentsRouter from "./assignments";
import externalRouter from "./external";
import scoresRouter from "./scores";
import reportsRouter from "./reports";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import batteriesRouter from "./batteries";
import portalRouter from "./portal";
import storageRouter from "./storage";
import reportAccessRouter from "./reportAccess";
import rppiRouter from "./rppi";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(casesRouter);
router.use(assessmentToolsRouter);
router.use(assignmentsRouter);
router.use(externalRouter);
router.use(scoresRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(batteriesRouter);
router.use(portalRouter);
router.use(storageRouter);
router.use(reportAccessRouter);
router.use(rppiRouter);

export default router;
