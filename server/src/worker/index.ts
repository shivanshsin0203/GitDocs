import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { QUEUE_NAME, JobData } from '../lib/queue'
import { processJob } from './processor'

console.log(`[worker] starting worker for queue "${QUEUE_NAME}" (concurrency=3)`)

export const readmeWorker = new Worker<JobData>(
  QUEUE_NAME,
  async (job) => {
    console.log(`[worker] picked up job=${job.id} repo=${job.data.repoOwner}/${job.data.repoName} user=${job.data.userId}`)
    const t0 = Date.now()
    try {
      const result = await processJob(job)
      console.log(`[worker] finished  job=${job.id} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
      return result
    } catch (err: any) {
      console.error(`[worker] errored   job=${job.id} after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, err.message)
      throw err
    }
  },
  {
    connection: redis.duplicate(),
    concurrency: 3,
  },
)

readmeWorker.on('ready',  () => console.log('[worker] ready'))
readmeWorker.on('closed', () => console.log('[worker] closed'))
readmeWorker.on('error',  (err) => console.error('[worker] error:', err.message))
