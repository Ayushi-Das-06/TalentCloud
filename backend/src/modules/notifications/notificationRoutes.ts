import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from './notificationController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.patch('/:id/read', authenticateToken, validateParams(z.object({ id: z.string().uuid() })), markAsRead);
router.post('/read-all', authenticateToken, markAllAsRead);

export default router;
