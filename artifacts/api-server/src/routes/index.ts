import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foldersRouter from "./folders";
import projectsRouter, { studioRouter } from "./projects";
import statsRouter from "./stats";
import storageRouter from "./storage";
import { requireClerkAuth } from "../middlewares/requireClerkAuth";

const router: IRouter = Router();

router.use(healthRouter);

router.use(studioRouter);

router.use(requireClerkAuth, foldersRouter);
router.use(requireClerkAuth, statsRouter);
router.use(requireClerkAuth, storageRouter);
router.use(requireClerkAuth, projectsRouter);

export default router;
