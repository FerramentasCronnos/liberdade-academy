import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  console.warn('[redis]', err.message);
});

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis.status !== 'ready') await redis.connect().catch(() => undefined);
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  try {
    if (redis.status !== 'ready') await redis.connect().catch(() => undefined);
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // cache opcional
  }
}
