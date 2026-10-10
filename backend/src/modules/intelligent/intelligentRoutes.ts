import { Router } from 'express';
import {
  matchFreelancersForProject,
  matchProjectsForFreelancer,
  getSkillGapAnalysis,
  getEstimate,
  estimateSchema,
} from './intelligentController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { expensiveOperationRateLimit } from '../../middleware/rateLimit.js';
import { z } from 'zod';

const router = Router();

const skillGapSchema = z.object({
  projectId: z.string().uuid().optional(),
  targetSkills: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
}).refine((data) => !(data.projectId && data.targetSkills), {
  message: 'Choose a project or provide custom skills, not both',
});

router.get(
  '/match/project/:projectId',
  authenticateToken,
  requireRole(['CLIENT', 'ADMIN']),
  expensiveOperationRateLimit,
  validateParams(z.object({ projectId: z.string().uuid() })),
  matchFreelancersForProject,
);
router.get('/match/freelancer', authenticateToken, requireRole(['FREELANCER']), expensiveOperationRateLimit, matchProjectsForFreelancer);
router.post('/skill-gap', authenticateToken, requireRole(['FREELANCER']), expensiveOperationRateLimit, validateBody(skillGapSchema), getSkillGapAnalysis);
router.post('/estimate', validateBody(estimateSchema), getEstimate);

export default router;
