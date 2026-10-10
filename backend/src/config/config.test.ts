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
