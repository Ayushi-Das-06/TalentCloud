import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, configMock } = vi.hoisted(() => ({
  prismaMock: {
    backgroundJob: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
  },
  configMock: { queue: { driver: 'memory', redis: { host: 'localhost', port: 6379, password: undefined }, sqs: {} } },
}));

vi.mock('../db/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../config/index.js', () => ({ config: configMock }));

describe('in-memory queue processing', () => {
  let queueService: typeof import('./queueAdapter.js').queueService;

  beforeEach(async () => {
    vi.resetModules();
    prismaMock.backgroundJob.create.mockResolvedValue({});
    prismaMock.backgroundJob.update.mockResolvedValue({});
    const adapter = await import('./queueAdapter.js');
    queueService = adapter.queueService;
  });

  afterEach(async () => {
    await queueService.close();
    vi.clearAllMocks();
  });

  it('processes file references asynchronously and persists terminal status', async () => {
    const handled = vi.fn(async (job: { data: { fileKey: string; mimeType: string } }) => ({ analyzed: job.data.fileKey.endsWith('.pdf') }));
    queueService.registerHandler('RESUME_ANALYSIS', handled);
    const enqueued = await queueService.enqueue('RESUME_ANALYSIS', { fileKey: 'resumes/a.pdf', mimeType: 'application/pdf' });

    await vi.waitFor(() => {
      expect(prismaMock.backgroundJob.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: enqueued.id },
        data: expect.objectContaining({ status: 'COMPLETED', result: JSON.stringify({ analyzed: true }) }),
      }));
    });
    expect(handled).toHaveBeenCalledTimes(1);
    expect(prismaMock.backgroundJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ payload: JSON.stringify({ fileKey: 'resumes/a.pdf', mimeType: 'application/pdf' }) }),
    }));
  });

  it('retries a failed handler up to the configured bounded attempt count', async () => {
    let attempts = 0;
    queueService.registerHandler('RETRY_TEST', async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('temporary failure');
      return { ok: true };
    });
    const job = await queueService.enqueue('RETRY_TEST', { fileKey: 'resumes/b.txt' }, 3);

    await vi.waitFor(() => {
      expect(prismaMock.backgroundJob.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: job.id },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }));
    });
    expect(attempts).toBe(3);
  });

  it('marks a job failed after exhausting retries', async () => {
    queueService.registerHandler('FAIL_TEST', async () => { throw new Error('permanent failure'); });
    const job = await queueService.enqueue('FAIL_TEST', { fileKey: 'resumes/c.txt' }, 2);

    await vi.waitFor(() => {
      expect(prismaMock.backgroundJob.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: job.id },
        data: expect.objectContaining({ status: 'FAILED', error: 'permanent failure', retryCount: 2 }),
      }));
    });
  });
});
