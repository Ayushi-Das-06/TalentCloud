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

describe('object storage configuration', () => {
  it('requires an explicit bucket when S3 storage is enabled', async () => {
    vi.stubEnv('STORAGE_DRIVER', 's3');
    vi.stubEnv('S3_BUCKET_NAME', '   ');
    await expect(import('./index.js')).rejects.toThrow(/S3_BUCKET_NAME is required/i);
  });

  it('accepts a configured S3 bucket', async () => {
    vi.stubEnv('STORAGE_DRIVER', 's3');
    vi.stubEnv('S3_BUCKET_NAME', 'talentcloud-private-test');
    const { config } = await import('./index.js');
    expect(config.storage.s3.bucket).toBe('talentcloud-private-test');
  });
});
