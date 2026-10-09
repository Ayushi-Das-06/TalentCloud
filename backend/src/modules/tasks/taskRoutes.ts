import { Router } from 'express';
import { getProjectTasks, createTask, updateTaskStatus, deleteTask } from './taskController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.get('/project/:projectId', authenticateToken, getProjectTasks);
router.post('/', authenticateToken, createTask);
router.patch('/:taskId/status', authenticateToken, updateTaskStatus);
router.delete('/:taskId', authenticateToken, deleteTask);

export default router;
