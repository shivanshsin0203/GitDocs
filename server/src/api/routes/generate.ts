import { Router } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { db } from "../../db";
import { users } from "../../db/schema";
import { redis } from "../../lib/redis";
import { readmeQueue } from "../../lib/queue";

const router = Router();

const JOB_HASH_TTL = 6 * 3600;

const generateBodySchema = z.object({
  repoOwner: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/, "Invalid GitHub owner"),
  repoName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "Invalid GitHub repo name"),
});
type GenerateBody = z.infer<typeof generateBodySchema>;

// POST /api/generate — enqueue a README generation job
router.post("/", authenticate, validate({ body: generateBodySchema }), async (req, res) => {
  try {
    const { repoOwner, repoName } = req.validated!.body as GenerateBody;

    const [user] = await db
      .select({ githubToken: users.githubToken })
      .from(users)
      .where(eq(users.id, req.userId!));

    if (!user?.githubToken) {
      console.warn(`[generate] no github token for user=${req.userId}`);
      return res.status(400).json({ error: "GitHub token not found for user" });
    }

    const jobId = randomUUID();
    const userId = req.userId!;
    const now = Date.now();

    // Seed Redis so a refresh right after enqueue shows the card in 'queued' state
    await redis.hset(`job:${jobId}`, {
      userId,
      repoOwner,
      repoName,
      stage: "queued",
      updatedAt: now,
    });
    await redis.expire(`job:${jobId}`, JOB_HASH_TTL);
    await redis.sadd(`user:${userId}:active`, jobId);
    console.log(`[generate] seeded redis  job=${jobId} user=${userId} repo=${repoOwner}/${repoName}`);

    await readmeQueue.add(
      "readme",
      {
        jobId,
        userId,
        repoOwner,
        repoName,
        githubToken: user.githubToken,
      },
      { jobId },
    );
    console.log(`[generate] enqueued     job=${jobId}`);

    return res.json({
      jobId,
      repoOwner,
      repoName,
      stage: "queued",
      updatedAt: now,
    });
  } catch (err: any) {
    console.error("[generate] error:", err);
    return res.status(500).json({ error: "Failed to enqueue job" });
  }
});

export default router;
