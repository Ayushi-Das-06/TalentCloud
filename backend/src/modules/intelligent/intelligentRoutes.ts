import { Router } from 'express';
import {
  matchFreelancersForProject,
  matchProjectsForFreelancer,
  getSkillGapAnalysis,
  getEstimate,
} from './intelligentController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

router.get('/match/project/:projectId', matchFreelancersForProject);
router.get('/match/freelancer', authenticateToken, requireRole(['FREELANCER']), matchProjectsForFreelancer);
router.post('/skill-gap', authenticateToken, requireRole(['FREELANCER']), getSkillGapAnalysis);
router.post('/estimate', getEstimate);

export default router;
