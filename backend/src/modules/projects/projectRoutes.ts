import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  getClientProjects,
} from './projectController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getProjects);
router.get('/my-projects', authenticateToken, requireRole(['CLIENT']), getClientProjects);
router.get('/:id', getProjectById);

// Client-only routes
router.post('/', authenticateToken, requireRole(['CLIENT']), createProject);
router.put('/:id', authenticateToken, requireRole(['CLIENT']), updateProject);

export default router;
