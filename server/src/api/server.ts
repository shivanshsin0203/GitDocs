import { Router } from "express";
import generateRouter from "./routes/generate";
import statusRouter from "./routes/status";
import authRouter from "./routes/auth";
import dashboardRouter from "./routes/dashboard";
import projectsRouter from "./routes/projects";
import {
  authLimiter,
  generateLimiter,
  prLimiter,
  readLimiter,
} from "./middleware/rateLimit";

const router = Router();

router.use("/auth", authLimiter, authRouter);
router.use("/generate", generateLimiter, generateRouter);
router.use("/status", readLimiter, statusRouter);
router.use("/dashboard", readLimiter, dashboardRouter);

// PR creation is the expensive write on /projects — apply the stricter limiter
// first so it runs before the read limiter on the same path.
router.use("/projects/:id/pr", prLimiter);
router.use("/projects", readLimiter, projectsRouter);

export default router;
