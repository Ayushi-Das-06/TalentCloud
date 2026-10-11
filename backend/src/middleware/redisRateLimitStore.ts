import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import type Redis from 'ioredis';

const incrementScript = `
local total = redis.call('INCR', KEYS[1])
if total == 1 or redis.call('PTTL', KEYS[1]) < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { total, redis.call('PTTL', KEYS[1]) }
`;

const decrementScript = `
local total = redis.call('DECR', KEYS[1])
if total <= 0 then redis.call('DEL', KEYS[1]); return 0 end
return total
`;

export function createRedisRateLimitStore(redis: Redis, namespace: string): Store {
  const prefix = `talentcloud:rate-limit:${namespace}:`;
  let windowMs = 60_000;

  const store: Store = {
    prefix,
    localKeys: false,
    init(options: Options) {
      windowMs = options.windowMs;
    },
    async increment(key: string): Promise<ClientRateLimitInfo> {
      const result = await redis.eval(incrementScript, 1, `${prefix}${key}`, String(windowMs)) as [number | string, number | string];
      const totalHits = Number(result[0]);
      const ttl = Math.max(0, Number(result[1]));
      return { totalHits, resetTime: new Date(Date.now() + ttl) };
    },
    async decrement(key: string): Promise<void> {
      await redis.eval(decrementScript, 1, `${prefix}${key}`);
    },
    async resetKey(key: string): Promise<void> {
      await redis.del(`${prefix}${key}`);
    },
    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
      const redisKey = `${prefix}${key}`;
      const [count, ttl] = await Promise.all([redis.get(redisKey), redis.pttl(redisKey)]);
      if (count === null || Number(ttl) < 0) return undefined;
      return { totalHits: Number(count), resetTime: new Date(Date.now() + Number(ttl)) };
    },
    async resetAll(): Promise<void> {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', '100');
        cursor = nextCursor;
        if (keys.length > 0) await redis.del(...keys);
      } while (cursor !== '0');
    },
  };
  return store;
}
