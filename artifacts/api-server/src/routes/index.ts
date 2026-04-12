import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foldersRouter from "./folders";
import projectsRouter from "./projects";
import statsRouter from "./stats";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(foldersRouter);
router.use(projectsRouter);
router.use(statsRouter);
router.use(storageRouter);

export default router;
