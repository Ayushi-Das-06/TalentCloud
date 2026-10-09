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

const router = Router();

// Public routes
router.get('/freelancers', getFreelancers);
router.get('/freelancers/:id', getFreelancerById);
router.get('/clients/:id', getClientProfile);

// Authenticated Freelancer routes
router.put('/freelancer', authenticateToken, requireRole(['FREELANCER']), updateFreelancerProfile);
router.post('/freelancer/skills', authenticateToken, requireRole(['FREELANCER']), addFreelancerSkill);
router.delete('/freelancer/skills/:skillId', authenticateToken, requireRole(['FREELANCER']), removeFreelancerSkill);

// Authenticated Client routes
router.put('/client', authenticateToken, requireRole(['CLIENT']), updateClientProfile);

export default router;
