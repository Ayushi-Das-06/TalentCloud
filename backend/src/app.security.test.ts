import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { app } from './app.js';

describe('API access controls', () => {
  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it('keeps administrative metrics and queue operations behind authentication', async () => {
    for (const [path, method] of [
      ['/admin/stats', 'GET'],
      ['/admin/queue', 'GET'],
      ['/admin/queue/burst', 'POST'],
      ['/admin/queue/retry/example', 'POST'],
    ] as const) {
      const response = await fetch(`${baseUrl}${path}`, { method });
      expect(response.status).toBe(401);
    }
  });

  it('requires authentication for candidate matching and file downloads', async () => {
    const matchResponse = await fetch(`${baseUrl}/intelligent/match/project/example`);
    const fileResponse = await fetch(`${baseUrl}/files/resumes%2Fprivate.pdf`);
    expect(matchResponse.status).toBe(401);
    expect(fileResponse.status).toBe(401);
  });

  it('requires authentication before project attachment uploads', async () => {
    const response = await fetch(`${baseUrl}/files/projects/example`, { method: 'POST' });
    expect(response.status).toBe(401);
  });

  it('requires authentication before project attachment deletion', async () => {
    const response = await fetch(`${baseUrl}/files/projects/example/file-example`, { method: 'DELETE' });
    expect(response.status).toBe(401);
  });

  it('rate limits repeated registration attempts', async () => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      lastStatus = response.status;
      await response.arrayBuffer();
    }
    expect(lastStatus).toBe(429);
  });

  it('exposes the API health check without authentication', async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe('HEALTHY');
  });

  it('validates estimator input while keeping estimation public', async () => {
    const valid = await fetch(`${baseUrl}/intelligent/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'Web Development', complexity: 'HIGH', tasksCount: 4, skillsCount: 3 }),
    });
    const invalid = await fetch(`${baseUrl}/intelligent/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complexity: 'IMPOSSIBLE', tasksCount: -10 }),
    });
    expect(valid.status).toBe(200);
    expect(invalid.status).toBe(400);
  });
});
