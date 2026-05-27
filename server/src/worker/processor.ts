import type { Job } from 'bullmq'
import { redis } from '../lib/redis'
import type { JobData } from '../lib/queue'
import { db } from '../db'
import { projects } from '../db/schema'
import { getFileTree, analyzeWithDeepSeek, MAX_FILES } from './stages/stage1-analyze'
import { fetchAllFiles, buildFilesBlock } from './stages/stage2-fetch'
import { generateReadme } from './stages/stage3-generate'

export type Stage = 'queued' | 'analyzing' | 'generating' | 'completed' | 'failed' | 'rejected'

const JOB_HASH_TTL    = 6 * 3600   // 6h while active
const JOB_HASH_DONE   = 1 * 3600   // 1h after completion/failure/rejection

function jobKey(jobId: string)    { return `job:${jobId}` }
function userKey(userId: string)  { return `user:${userId}:active` }

async function setStage(
  jobId: string,
  stage: Stage,
  extras: Record<string, string | number> = {},
) {
  const payload: Record<string, string | number> = {
    stage,
    updatedAt: Date.now(),
    ...extras,
  }
  await redis.hset(jobKey(jobId), payload)
  console.log(`[processor] stage=${stage} job=${jobId}`, extras)
  return payload
}

async function cleanupRedis(jobId: string, userId: string) {
  await redis.srem(userKey(userId), jobId)
  await redis.expire(jobKey(jobId), JOB_HASH_DONE)
  console.log(`[processor] cleanup  job=${jobId} (removed from user:${userId}:active, ttl ${JOB_HASH_DONE}s)`)
}

export async function processJob(job: Job<JobData>): Promise<unknown> {
  const { jobId, userId, repoOwner, repoName, githubToken } = job.data

  // refresh TTL — job is now active
  await redis.expire(jobKey(jobId), JOB_HASH_TTL)

  const push = async (stage: Stage, extras: Record<string, string | number> = {}) => {
    const payload = await setStage(jobId, stage, extras)
    // QueueEvents 'progress' is what SSE listens to
    await job.updateProgress({ jobId, ...payload })
  }

  try {
    // ──────────── Stage 0: tree fetch ────────────
    await push('analyzing')
    const paths = await getFileTree(repoOwner, repoName, githubToken)

    // hard reject — too large, no DB row, just emit and exit
    if (paths.length > MAX_FILES) {
      const msg = `Repository too large (${paths.length} files; limit ${MAX_FILES})`
      console.log(`[processor] REJECTED job=${jobId} ${msg}`)
      await push('rejected', { errorMessage: msg })
      await cleanupRedis(jobId, userId)
      return { rejected: true, reason: msg }
    }

    // ──────────── Stage 1: DeepSeek analysis ────────────
    const analysis = await analyzeWithDeepSeek(repoOwner, repoName, paths)

    await push('generating', {
      displayName:      analysis.displayName,
      shortDescription: analysis.shortDescription,
      language:         analysis.language ?? '',
    })

    // ──────────── Stage 2a: fetch files ────────────
    const files      = await fetchAllFiles(repoOwner, repoName, analysis.filesToRead, githubToken)
    const filesBlock = buildFilesBlock(files)

    // ──────────── Stage 2b: README generation ────────────
    const readme = await generateReadme(repoOwner, repoName, analysis, filesBlock)

    // ──────────── Persist completed project ────────────
    const [project] = await db.insert(projects).values({
      userId,
      repoOwner,
      repoName,
      displayName:    analysis.displayName,
      description:    analysis.shortDescription,
      language:       analysis.language || null,
      readmeMarkdown: readme,
      status:         'completed',
    }).returning()

    console.log(`[processor] persisted project=${project.id} for job=${jobId}`)
    await push('completed', { projectId: project.id })
    await cleanupRedis(jobId, userId)
    return { projectId: project.id }

  } catch (err: any) {
    const msg = err?.message ?? 'Unknown error'
    console.error(`[processor] FAILED   job=${jobId}: ${msg}`)
    try {
      await db.insert(projects).values({
        userId,
        repoOwner,
        repoName,
        status:       'failed',
        errorMessage: msg,
      })
    } catch (dbErr: any) {
      console.error(`[processor] could not persist failure for job=${jobId}:`, dbErr.message)
    }
    await push('failed', { errorMessage: msg })
    await cleanupRedis(jobId, userId)
    throw err
  }
}
