import IORedis from 'ioredis'

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is required')
}

console.log('[redis] connecting to', process.env.REDIS_URL.replace(/:[^:@]+@/, ':***@'))

export const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('connect',      () => console.log('[redis] TCP connected'))
redis.on('ready',        () => console.log('[redis] ready'))
redis.on('reconnecting', () => console.log('[redis] reconnecting...'))
redis.on('end',          () => console.log('[redis] connection ended'))
redis.on('error',        (err) => console.error('[redis] error:', err.message))
