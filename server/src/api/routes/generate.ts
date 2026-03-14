import { Router } from "express";

const router = Router();

// POST /generate - adds a job to the queue
router.post("/", (_req, res) => {
  res.redirect("http://localhost:5173/test");
});

export default router;
