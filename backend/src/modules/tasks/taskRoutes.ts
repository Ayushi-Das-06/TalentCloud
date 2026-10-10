import { Router } from 'express';
import { getProjectTasks, createTask, updateTaskStatus, deleteTask } from './taskController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(10_000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  assignedToProfileId: z.string().uuid().optional().nullable(),
});

router.get('/project/:projectId', authenticateToken, validateParams(z.object({ projectId: z.string().uuid() })), getProjectTasks);
router.post('/', authenticateToken, validateBody(createTaskSchema), createTask);
router.patch('/:taskId/status', authenticateToken, validateParams(z.object({ taskId: z.string().uuid() })), updateTaskStatus);
router.delete('/:taskId', authenticateToken, validateParams(z.object({ taskId: z.string().uuid() })), deleteTask);

export default router;
