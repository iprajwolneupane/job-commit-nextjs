import IORedis from 'ioredis'

let redisConnection: IORedis | null = null

export function getRedisConnection() {
  redisConnection ??= new IORedis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
  })

  return redisConnection
}

export async function closeRedisConnection() {
  if (!redisConnection) return

  await redisConnection.quit()
  redisConnection = null
}
