import { Router } from 'express';
import {
  submitApplication,
  getFreelancerApplications,
  getProjectApplications,
  withdrawApplication,
} from './applicationController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const applicationSchema = z.object({
  projectId: z.string().uuid(),
  coverLetter: z.string().trim().min(10).max(10_000),
  proposedBudget: z.coerce.number().finite().positive().max(1_000_000_000),
  estimatedDays: z.coerce.number().int().min(1).max(3650),
});

// Freelancer routes
router.post('/', authenticateToken, requireRole(['FREELANCER']), validateBody(applicationSchema), submitApplication);
router.get('/my-applications', authenticateToken, requireRole(['FREELANCER']), getFreelancerApplications);
router.post('/:id/withdraw', authenticateToken, requireRole(['FREELANCER']), validateParams(z.object({ id: z.string().uuid() })), withdrawApplication);

// Client routes
router.get('/project/:projectId', authenticateToken, requireRole(['CLIENT']), validateParams(z.object({ projectId: z.string().uuid() })), getProjectApplications);

export default router;
