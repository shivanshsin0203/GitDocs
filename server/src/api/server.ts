import { Router } from "express";
import generateRouter from "./routes/generate";
import statusRouter from "./routes/status";
import authRouter from "./routes/auth";

const router = Router();

router.use("/generate", generateRouter);
router.use("/status", statusRouter);
router.use("/auth", authRouter);

export default router;
