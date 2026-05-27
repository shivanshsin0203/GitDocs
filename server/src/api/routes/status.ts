import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { redis } from "../../lib/redis";
import { readmeEvents } from "../../lib/queue";

const router = Router();

// GET /api/status/stream — per-user SSE
// Sends:
//   event: snapshot   data: { active: [{jobId, ...}] }
//   event: update     data: { jobId, stage, ... }
//   event: ping       (heartbeat)
router.get("/stream", authenticate, async (req: Request, res: Response) => {
  const userId = req.userId!;
  console.log(`[sse] connect user=${userId}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 1) initial snapshot replay so a refreshed client gets current state immediately
  try {
    const ids = await redis.smembers(`user:${userId}:active`);
    const active = await Promise.all(
      ids.map(async (id) => {
        const data = await redis.hgetall(`job:${id}`);
        return Object.keys(data).length ? { jobId: id, ...data } : null;
      }),
    );
    const filtered = active.filter(Boolean);
    console.log(`[sse] snapshot user=${userId} active=${filtered.length}`);
    send("snapshot", { active: filtered });
  } catch (err: any) {
    console.error(`[sse] snapshot failed user=${userId}:`, err.message);
    send("snapshot", { active: [] });
  }

  // 2) live tail — filter QueueEvents by userId via the job hash
  const onProgress = async ({ jobId, data }: { jobId: string; data: unknown }) => {
    try {
      const hash = await redis.hgetall(`job:${jobId}`);
      if (hash.userId !== userId) return;
      const payload = { jobId, ...hash, ...(typeof data === "object" && data ? data : {}) };
      send("update", payload);
    } catch (err: any) {
      console.error(`[sse] progress handler error:`, err.message);
    }
  };

  const onFailed = async ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
    try {
      const hash = await redis.hgetall(`job:${jobId}`);
      if (hash.userId !== userId) return;
      send("update", { jobId, ...hash, stage: "failed", errorMessage: failedReason });
    } catch (err: any) {
      console.error(`[sse] failed handler error:`, err.message);
    }
  };

  readmeEvents.on("progress", onProgress);
  readmeEvents.on("failed",   onFailed);

  // 3) heartbeat to keep proxies / browsers from closing the connection
  const heartbeat = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    readmeEvents.off("progress", onProgress);
    readmeEvents.off("failed",   onFailed);
    console.log(`[sse] disconnect user=${userId}`);
  });
});

export default router;
