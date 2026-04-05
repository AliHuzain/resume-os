import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resumesRouter from "./resumes";
import uploadRouter from "./upload";
import aiRouter from "./ai";
import anthropicRouter from "./anthropic/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(resumesRouter);
router.use(aiRouter);
router.use("/anthropic", anthropicRouter);

export default router;
