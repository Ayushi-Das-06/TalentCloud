import { Router } from 'express';
import {
  matchFreelancersForProject,
  matchProjectsForFreelancer,
  getSkillGapAnalysis,
  getEstimate,
  estimateSchema,
} from './intelligentController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

router.get(
  '/match/project/:projectId',
  authenticateToken,
  requireRole(['CLIENT', 'ADMIN']),
  matchFreelancersForProject,
);
router.get('/match/freelancer', authenticateToken, requireRole(['FREELANCER']), matchProjectsForFreelancer);
router.post('/skill-gap', authenticateToken, requireRole(['FREELANCER']), getSkillGapAnalysis);
router.post('/estimate', validateBody(estimateSchema), getEstimate);

export default router;
