import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    project: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    contract: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('../../db/prisma.js', () => ({ prisma: prismaMock }));

import { getProjectById, getProjects } from './projectController.js';
import { createProjectSchema, projectQuerySchema } from './projectSchemas.js';

function makeResponse() {
  const response = {
    status: vi.fn(function (this: unknown) { return this; }),
    json: vi.fn(),
  };
  return response as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('public project visibility', () => {
  afterEach(() => vi.resetAllMocks());

  it('keeps unauthenticated ALL filters scoped to open projects', async () => {
    prismaMock.project.findMany.mockResolvedValue([]);
    prismaMock.project.count.mockResolvedValue(0);
    const req = { query: { status: 'ALL', page: '1', limit: '10' } } as unknown as Request;
    const res = makeResponse();

    await getProjects(req, res, vi.fn());

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'OPEN' } }));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('hides a non-open project from unauthenticated detail requests', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'draft-id', status: 'DRAFT', clientId: 'client-id' });
    const req = { params: { id: 'draft-id' } } as unknown as Request;
    const res = makeResponse();

    await getProjectById(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prismaMock.contract.findFirst).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed pagination rather than coercing it', async () => {
    const req = { query: { page: 'not-a-number', limit: '10' } } as unknown as Request;
    const res = makeResponse();

    await getProjects(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });

  it('rejects invalid project budgets and malformed project query values', () => {
    const validProject = {
      title: 'Cloud telemetry platform',
      description: 'Build a reliable telemetry ingestion platform for distributed systems.',
      category: 'Cloud / DevOps',
      minBudget: 500,
      maxBudget: 400,
      skills: ['TypeScript'],
    };
    expect(createProjectSchema.safeParse(validProject).success).toBe(false);
    expect(projectQuerySchema.safeParse({ page: '0', limit: '500' }).success).toBe(false);
  });
});
