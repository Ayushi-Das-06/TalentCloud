import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('production secret configuration', () => {
  it('rejects missing signing secrets', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('COOKIE_SECRET', '');
    await expect(import('./index.js')).rejects.toThrow(/development defaults are not allowed/i);
  });

  it('rejects known development defaults even when they are long enough', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'development_super_secret_jwt_key_at_least_32_chars');
    vi.stubEnv('COOKIE_SECRET', 'a-unique-cookie-secret-is-long-enough-123');
    await expect(import('./index.js')).rejects.toThrow(/development defaults are not allowed/i);
  });

  it('accepts unique production secrets of sufficient length', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'unique-jwt-secret-value-for-production-123456');
    vi.stubEnv('COOKIE_SECRET', 'unique-cookie-secret-value-for-production-12345');
    const { config } = await import('./index.js');
    expect(config.jwt.secret).toBe('unique-jwt-secret-value-for-production-123456');
  });
});

describe('shared rate-limit Redis configuration', () => {
  it('rejects a malformed Redis connection URL', async () => {
    vi.stubEnv('RATE_LIMIT_REDIS_URL', 'https://not-redis.example');
    await expect(import('./index.js')).rejects.toThrow(/RATE_LIMIT_REDIS_URL must be a valid redis/i);
  });

  it('accepts a TLS Redis URL', async () => {
    vi.stubEnv('RATE_LIMIT_REDIS_URL', 'rediss://rate-limiter.example:6380');
    const { config } = await import('./index.js');
    expect(config.rateLimit.redisUrl).toBe('rediss://rate-limiter.example:6380');
  });
});
