import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  getClientProjects,
} from './projectController.js';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';
import { createProjectSchema, projectQuerySchema, updateProjectSchema } from './projectSchemas.js';

const router = Router();

// Public routes
router.get('/', optionalAuthenticateToken, validateQuery(projectQuerySchema), getProjects);
router.get('/my-projects', authenticateToken, requireRole(['CLIENT']), getClientProjects);
router.get('/:id', optionalAuthenticateToken, validateParams(z.object({ id: z.string().uuid() })), getProjectById);

// Client-only routes
router.post('/', authenticateToken, requireRole(['CLIENT']), validateBody(createProjectSchema), createProject);
router.put('/:id', authenticateToken, requireRole(['CLIENT']), validateParams(z.object({ id: z.string().uuid() })), validateBody(updateProjectSchema), updateProject);

export default router;
