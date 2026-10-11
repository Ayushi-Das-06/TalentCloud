import { describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';
import type { Options } from 'express-rate-limit';
import { createRedisRateLimitStore } from './redisRateLimitStore.js';

describe('shared Redis rate-limit store', () => {
  it('uses a namespaced Redis key and returns a reset time from the atomic counter TTL', async () => {
    const evalCommand = vi.fn(async () => [2, 5_000]);
    const redis = { eval: evalCommand } as unknown as Redis;
    const store = createRedisRateLimitStore(redis, 'auth');
    store.init?.({ windowMs: 5_000 } as Options);

    const result = await store.increment('127.0.0.1');

    expect(result.totalHits).toBe(2);
    expect(result.resetTime).toBeInstanceOf(Date);
    expect(result.resetTime!.getTime()).toBeGreaterThanOrEqual(Date.now() + 4_990);
    expect(evalCommand).toHaveBeenCalledWith(expect.stringContaining('PEXPIRE'), 1, 'talentcloud:rate-limit:auth:127.0.0.1', '5000');
  });

  it('uses separate namespaces for independent limit policies', async () => {
    const evalCommand = vi.fn(async () => [1, 60_000]);
    const redis = { eval: evalCommand } as unknown as Redis;
    const authStore = createRedisRateLimitStore(redis, 'auth');
    const uploadStore = createRedisRateLimitStore(redis, 'uploads');

    await authStore.increment('same-client');
    await uploadStore.increment('same-client');

    expect(evalCommand.mock.calls.map((call) => call[2])).toEqual([
      'talentcloud:rate-limit:auth:same-client',
      'talentcloud:rate-limit:uploads:same-client',
    ]);
  });
});
