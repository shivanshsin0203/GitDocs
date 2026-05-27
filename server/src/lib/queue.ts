import { Queue, QueueEvents } from 'bullmq'
import { redis } from './redis'

export const QUEUE_NAME = 'gitdocs-readme'

export type JobData = {
  jobId:       string
  userId:      string
  repoOwner:   string
  repoName:    string
  githubToken: string
}

console.log(`[queue] initializing queue "${QUEUE_NAME}"`)

export const readmeQueue = new Queue<JobData>(QUEUE_NAME, {
  connection: redis,
})

export const readmeEvents = new QueueEvents(QUEUE_NAME, {
  connection: redis.duplicate(),
})

readmeEvents.on('waiting',   ({ jobId })             => console.log(`[queueEvents] waiting   job=${jobId}`))
readmeEvents.on('active',    ({ jobId })             => console.log(`[queueEvents] active    job=${jobId}`))
readmeEvents.on('progress',  ({ jobId, data })       => console.log(`[queueEvents] progress  job=${jobId}`, data))
readmeEvents.on('completed', ({ jobId, returnvalue })=> console.log(`[queueEvents] completed job=${jobId}`, returnvalue))
readmeEvents.on('failed',    ({ jobId, failedReason})=> console.error(`[queueEvents] failed    job=${jobId}: ${failedReason}`))
readmeEvents.on('error',     (err)                    => console.error('[queueEvents] error:', err.message))
