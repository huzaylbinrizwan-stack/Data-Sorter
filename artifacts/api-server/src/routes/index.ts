import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foldersRouter from "./folders";
import projectsRouter, { studioRouter } from "./projects";
import statsRouter from "./stats";
import { storageAdminRouter, storagePublicRouter } from "./storage";
import materialsRouter from "./materials";
import variantsRouter from "./variants";
import measurementsRouter from "./measurements";
import meRouter from "./me";
import { requireClerkAuth } from "../middlewares/requireClerkAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use(healthRouter);

router.use(studioRouter);
router.use(storagePublicRouter);

router.use(requireClerkAuth, meRouter);
router.use(requireAdmin, foldersRouter);
router.use(requireAdmin, statsRouter);
router.use(requireAdmin, storageAdminRouter);
router.use(requireAdmin, projectsRouter);
router.use(requireAdmin, materialsRouter);
router.use(requireAdmin, variantsRouter);
router.use(requireAdmin, measurementsRouter);

export default router;
