import { Router } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { authenticate } from "../middleware/auth";
import { db } from "../../db";
import { projects, users } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { createReadmePR } from "../../lib/github-pr";
import { redis } from "../../lib/redis";
import { readmeQueue } from "../../lib/queue";

const router = Router();

const JOB_HASH_TTL = 6 * 3600;

const MAX_IMAGE_BYTES   = 5  * 1024 * 1024
const MAX_TOTAL_BYTES   = 25 * 1024 * 1024
const MAX_MARKDOWN_BYTES = 1  * 1024 * 1024
const MAX_TITLE_LEN     = 120
const MAX_DESC_LEN      = 5000
// nanoid default alphabet is [A-Za-z0-9_-]
const IMAGE_PATH_RE     = /^readmeImages\/img-[A-Za-z0-9_-]{8}\.(png|jpg|jpeg|gif|webp)$/
const ALLOWED_EXTS      = new Set(["png", "jpg", "jpeg", "gif", "webp"])

// Magic-byte sniff to confirm the claimed extension matches the actual bytes.
function sniffExt(buf: Buffer): string | null {
  if (buf.length < 12) return null
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png"
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg"
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif"
  // WEBP — "RIFF????WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp"
  return null
}

function extMatches(claimedExt: string, sniffed: string): boolean {
  if (claimedExt === sniffed) return true
  if (claimedExt === "jpeg" && sniffed === "jpg") return true
  if (claimedExt === "jpg" && sniffed === "jpg") return true
  return false
}

router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Invalid project id" })
    }

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.userId!)))
      .limit(1)

    if (!rows.length) {
      return res.status(404).json({ error: "Project not found" })
    }

    res.json({ project: rows[0] })
  } catch (err: any) {
    console.error(`[projects] GET /:id error:`, err.message)
    res.status(500).json({ error: "Failed to fetch project" })
  }
})

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Invalid project id" })
    }

    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.userId!)))
      .returning({ id: projects.id })

    if (!result.length) {
      return res.status(404).json({ error: "Project not found" })
    }

    console.log(`[projects] deleted ${id} user=${req.userId}`)
    res.status(204).end()
  } catch (err: any) {
    console.error(`[projects] DELETE /:id error:`, err.message)
    res.status(500).json({ error: "Failed to delete project" })
  }
})

router.post("/:id/retry", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Invalid project id" })
    }

    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.userId!)))
      .limit(1)

    if (!rows.length) {
      return res.status(404).json({ error: "Project not found" })
    }
    const project = rows[0]

    if (project.status !== "failed") {
      return res.status(409).json({ error: "Only failed projects can be retried" })
    }

    const [user] = await db
      .select({ githubToken: users.githubToken })
      .from(users)
      .where(eq(users.id, req.userId!))

    if (!user?.githubToken) {
      return res.status(401).json({ error: "GitHub token missing — please re-authenticate" })
    }

    // Drop the failed row so the worker can INSERT fresh on success
    await db.delete(projects).where(eq(projects.id, id))

    const jobId = randomUUID()
    const userId = req.userId!
    const now = Date.now()

    await redis.hset(`job:${jobId}`, {
      userId,
      repoOwner: project.repoOwner,
      repoName:  project.repoName,
      stage:     "queued",
      updatedAt: now,
    })
    await redis.expire(`job:${jobId}`, JOB_HASH_TTL)
    await redis.sadd(`user:${userId}:active`, jobId)
    console.log(`[projects] retry seeded redis job=${jobId} user=${userId} repo=${project.repoOwner}/${project.repoName} (was projectId=${id})`)

    await readmeQueue.add(
      "readme",
      {
        jobId,
        userId,
        repoOwner: project.repoOwner,
        repoName:  project.repoName,
        githubToken: user.githubToken,
      },
      { jobId },
    )
    console.log(`[projects] retry enqueued job=${jobId}`)

    res.json({
      jobId,
      repoOwner: project.repoOwner,
      repoName:  project.repoName,
      stage:     "queued",
      updatedAt: now,
    })
  } catch (err: any) {
    console.error(`[projects] POST /:id/retry error:`, err.message)
    res.status(500).json({ error: "Failed to retry project" })
  }
})

router.post("/:id/pr", authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Invalid project id" })
    }

    const body = req.body ?? {}
    const markdown = typeof body.markdown === "string" ? body.markdown : ""
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description = typeof body.description === "string" ? body.description : ""
    const incomingImages = Array.isArray(body.images) ? body.images : []

    // Basic shape validation
    if (!markdown || Buffer.byteLength(markdown, "utf8") > MAX_MARKDOWN_BYTES) {
      return res.status(400).json({ error: "Markdown missing or exceeds 1 MB" })
    }
    if (!title || title.length > MAX_TITLE_LEN) {
      return res.status(400).json({ error: "PR title required (max 120 chars)" })
    }
    if (description.length > MAX_DESC_LEN) {
      return res.status(400).json({ error: "PR description exceeds 5 KB" })
    }

    // Validate images
    const seenPaths = new Set<string>()
    let totalBytes = 0
    const decodedImages: { path: string; contentBase64: string }[] = []
    for (const img of incomingImages) {
      if (!img || typeof img.path !== "string" || typeof img.contentBase64 !== "string") {
        return res.status(400).json({ error: "Malformed image entry" })
      }
      if (!IMAGE_PATH_RE.test(img.path)) {
        return res.status(400).json({ error: `Invalid image path: ${img.path}` })
      }
      if (seenPaths.has(img.path)) {
        return res.status(400).json({ error: `Duplicate image path: ${img.path}` })
      }
      seenPaths.add(img.path)

      const buf = Buffer.from(img.contentBase64, "base64")
      if (buf.length === 0) {
        return res.status(400).json({ error: `Empty image: ${img.path}` })
      }
      if (buf.length > MAX_IMAGE_BYTES) {
        return res.status(400).json({ error: `Image exceeds 5 MB: ${img.path}` })
      }
      totalBytes += buf.length
      if (totalBytes > MAX_TOTAL_BYTES) {
        return res.status(400).json({ error: "Total image payload exceeds 25 MB" })
      }
      const claimedExt = img.path.split(".").pop()!.toLowerCase()
      if (!ALLOWED_EXTS.has(claimedExt)) {
        return res.status(400).json({ error: `Unsupported extension: ${img.path}` })
      }
      const sniffed = sniffExt(buf)
      if (!sniffed || !extMatches(claimedExt, sniffed)) {
        return res.status(400).json({ error: `Image bytes don't match extension: ${img.path}` })
      }
      decodedImages.push({ path: img.path, contentBase64: img.contentBase64 })
    }

    // Look up project + check ownership + lock check
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.userId!)))
      .limit(1)

    if (!rows.length) {
      return res.status(404).json({ error: "Project not found" })
    }
    const project = rows[0]

    if (project.prUrl) {
      return res.status(409).json({ error: "PR already submitted for this project", prUrl: project.prUrl })
    }

    // Fetch user token
    const userRows = await db
      .select({ githubToken: users.githubToken })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1)
    const githubToken = userRows[0]?.githubToken
    if (!githubToken) {
      return res.status(401).json({ error: "GitHub token missing — please re-authenticate" })
    }

    const branch = `gitdocs/readme-${randomBytes(3).toString("hex")}`

    let prResult
    try {
      prResult = await createReadmePR({
        token: githubToken,
        owner: project.repoOwner,
        repo:  project.repoName,
        markdown,
        title,
        description,
        branch,
        images: decodedImages,
      })
    } catch (err: any) {
      console.error(`[projects] PR creation failed for project=${id}:`, err.message)
      const status = (err as { status?: number }).status ?? 502
      return res.status(status === 401 ? 401 : 502).json({
        error: "PR creation failed",
        detail: err.message?.slice(0, 200) ?? "unknown",
      })
    }

    // Persist PR metadata + the edited markdown
    await db
      .update(projects)
      .set({
        readmeMarkdown: markdown,
        prUrl:          prResult.prUrl,
        prNumber:       prResult.prNumber,
        prStatus:       "open",
        prCheckedAt:    new Date(),
        updatedAt:      new Date(),
      })
      .where(eq(projects.id, id))

    res.json({ prUrl: prResult.prUrl, prNumber: prResult.prNumber, branch: prResult.branch })
  } catch (err: any) {
    console.error(`[projects] POST /:id/pr error:`, err.message)
    res.status(500).json({ error: "Failed to create PR" })
  }
})

export default router
