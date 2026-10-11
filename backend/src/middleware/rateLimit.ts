import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { createRedisRateLimitStore } from './redisRateLimitStore.js';

const rateLimitRedis = config.rateLimit.redisUrl
  ? new Redis(config.rateLimit.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    })
  : undefined;

rateLimitRedis?.on('error', () => {
  // Never log connection details because a Redis URL can include credentials.
  console.error('[RateLimit] Shared Redis store is unavailable.');
});

function storeFor(namespace: string) {
  return rateLimitRedis ? createRedisRateLimitStore(rateLimitRedis, namespace) : undefined;
}

const authStore = storeFor('auth');
const uploadStore = storeFor('uploads');
const expensiveStore = storeFor('expensive');

export async function closeRateLimitStore(): Promise<void> {
  if (!rateLimitRedis || rateLimitRedis.status === 'end') return;
  if (rateLimitRedis.status === 'ready') await rateLimitRedis.quit();
  else rateLimitRedis.disconnect();
}

const limitResponse = {
  success: false,
  error: 'Too many requests. Please wait before trying again.',
};

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitResponse,
  ...(authStore ? { store: authStore } : {}),
});

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitResponse,
  ...(uploadStore ? { store: uploadStore } : {}),
});

export const expensiveOperationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitResponse,
  ...(expensiveStore ? { store: expensiveStore } : {}),
});
