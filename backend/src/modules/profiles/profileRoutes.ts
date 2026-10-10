import { Router } from 'express';
import {
  getFreelancers,
  getFreelancerById,
  updateFreelancerProfile,
  addFreelancerSkill,
  removeFreelancerSkill,
  getClientProfile,
  updateClientProfile,
} from './profileController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../middleware/validate.js';

const router = Router();

const freelancerProfileSchema = z.object({
  headline: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(5000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  experienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).optional(),
  hourlyRate: z.union([z.number().finite().min(0).max(100_000), z.null()]).optional(),
  availability: z.enum(['FULL_TIME', 'PART_TIME', 'NOT_AVAILABLE']).optional(),
  portfolioLinks: z.array(z.object({ title: z.string().trim().min(1).max(120), url: z.string().url().max(500) })).max(30).optional(),
  education: z.array(z.string().trim().max(300)).max(30).optional(),
  preferredCategories: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});
const clientProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  website: z.union([z.string().url().max(500), z.literal('')]).optional(),
});
const freelancerSkillSchema = z.object({
  skillName: z.string().trim().min(1).max(60),
  yearsExperience: z.coerce.number().int().min(0).max(60).default(1),
});
const freelancerQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  skill: z.string().trim().min(1).max(60).optional(),
  level: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).optional(),
  availability: z.enum(['FULL_TIME', 'PART_TIME', 'NOT_AVAILABLE']).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// Public routes
router.get('/freelancers', validateQuery(freelancerQuerySchema), getFreelancers);
router.get('/freelancers/:id', validateParams(z.object({ id: z.string().uuid() })), getFreelancerById);
router.get('/clients/:id', validateParams(z.object({ id: z.string().uuid() })), getClientProfile);

// Authenticated Freelancer routes
router.put('/freelancer', authenticateToken, requireRole(['FREELANCER']), validateBody(freelancerProfileSchema), updateFreelancerProfile);
router.post('/freelancer/skills', authenticateToken, requireRole(['FREELANCER']), validateBody(freelancerSkillSchema), addFreelancerSkill);
router.delete('/freelancer/skills/:skillId', authenticateToken, requireRole(['FREELANCER']), validateParams(z.object({ skillId: z.string().uuid() })), removeFreelancerSkill);

// Authenticated Client routes
router.put('/client', authenticateToken, requireRole(['CLIENT']), validateBody(clientProfileSchema), updateClientProfile);

export default router;
