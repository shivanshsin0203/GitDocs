import { Router } from "express";

const router = Router();

// GET /status/:jobId - SSE for job status
router.get("/:jobId", (_req, res) => {
  res.json({ message: "status route" });
});

export default router;
