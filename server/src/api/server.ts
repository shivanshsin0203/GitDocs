import { Router } from "express";
import generateRouter from "./routes/generate";
import statusRouter from "./routes/status";
import authRouter from "./routes/auth";
import dashboardRouter from "./routes/dashboard";
import projectsRouter from "./routes/projects";

const router = Router();

router.use("/generate", generateRouter);
router.use("/status", statusRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/projects", projectsRouter);

export default router;
