import { Router } from "express";
import generateRouter from "./routes/generate";
import statusRouter from "./routes/status";

const router = Router();

router.use("/generate", generateRouter);
router.use("/status", statusRouter);

export default router;
