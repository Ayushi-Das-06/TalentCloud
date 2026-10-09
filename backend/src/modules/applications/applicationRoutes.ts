import { Router } from 'express';
import {
  submitApplication,
  getFreelancerApplications,
  getProjectApplications,
  withdrawApplication,
} from './applicationController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

// Freelancer routes
router.post('/', authenticateToken, requireRole(['FREELANCER']), submitApplication);
router.get('/my-applications', authenticateToken, requireRole(['FREELANCER']), getFreelancerApplications);
router.post('/:id/withdraw', authenticateToken, requireRole(['FREELANCER']), withdrawApplication);

// Client routes
router.get('/project/:projectId', authenticateToken, requireRole(['CLIENT']), getProjectApplications);

export default router;
