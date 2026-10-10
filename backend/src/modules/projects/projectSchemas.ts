import { z } from 'zod';

const deadlineSchema = z.string().datetime({ offset: true }).refine((deadline) => new Date(deadline).getTime() > Date.now(), 'Deadline must be in the future').optional().nullable();

export const projectQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  skill: z.string().trim().min(1).max(60).optional(),
  level: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).optional(),
  minBudget: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
  maxBudget: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
  status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ALL']).default('OPEN'),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(['newest', 'budget_high', 'budget_low']).default('newest'),
}).refine((data) => data.minBudget === undefined || data.maxBudget === undefined || data.minBudget <= data.maxBudget, {
  message: 'Minimum budget cannot exceed maximum budget',
  path: ['maxBudget'],
});

export const createProjectSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(20_000),
  category: z.string().trim().min(2).max(80),
  experienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).optional(),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  minBudget: z.coerce.number().finite().positive().max(1_000_000_000),
  maxBudget: z.coerce.number().finite().positive().max(1_000_000_000),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).default('USD'),
  estimatedDurationDays: z.coerce.number().int().min(1).max(3650).optional(),
  expectedDeliverables: z.string().trim().max(10_000).optional(),
  deadline: deadlineSchema,
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
}).refine((data) => data.minBudget <= data.maxBudget, {
  message: 'Minimum budget cannot exceed maximum budget',
  path: ['maxBudget'],
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(5).max(160).optional(),
  description: z.string().trim().min(20).max(20_000).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  minBudget: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
  maxBudget: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
  status: z.literal('CANCELLED').optional(),
  deadline: deadlineSchema,
}).refine((data) => data.minBudget === undefined || data.maxBudget === undefined || data.minBudget <= data.maxBudget, {
  message: 'Minimum budget cannot exceed maximum budget',
  path: ['maxBudget'],
});
