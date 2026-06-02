import IORedis from 'ioredis'
import { env } from './env'

console.log('[redis] connecting to', env.REDIS_URL.replace(/:[^:@]+@/, ':***@'))

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('connect',      () => console.log('[redis] TCP connected'))
redis.on('ready',        () => console.log('[redis] ready'))
redis.on('reconnecting', () => console.log('[redis] reconnecting...'))
redis.on('end',          () => console.log('[redis] connection ended'))
redis.on('error',        (err) => console.error('[redis] error:', err.message))
