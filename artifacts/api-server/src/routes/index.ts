import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foldersRouter from "./folders";
import projectsRouter, { studioRouter } from "./projects";
import statsRouter from "./stats";
import { storageAdminRouter, storagePublicRouter } from "./storage";
import materialsRouter from "./materials";
import variantsRouter from "./variants";
import measurementsRouter from "./measurements";
import { requireClerkAuth } from "../middlewares/requireClerkAuth";

const router: IRouter = Router();

router.use(healthRouter);

router.use(studioRouter);
router.use(storagePublicRouter);

router.use(requireClerkAuth, foldersRouter);
router.use(requireClerkAuth, statsRouter);
router.use(requireClerkAuth, storageAdminRouter);
router.use(requireClerkAuth, projectsRouter);
router.use(requireClerkAuth, materialsRouter);
router.use(requireClerkAuth, variantsRouter);
router.use(requireClerkAuth, measurementsRouter);

export default router;
