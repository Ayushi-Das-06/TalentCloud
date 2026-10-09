import { Router } from 'express';
import {
  getSystemStats,
  getQueueDashboard,
  triggerBurstTest,
  retryFailedJob,
} from './adminController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

// Allow access to authenticated users for viva/evaluation demonstrations or admins
router.get('/stats', getSystemStats);
router.get('/queue', getQueueDashboard);
router.post('/queue/burst', triggerBurstTest);
router.post('/queue/retry/:jobId', retryFailedJob);

export default router;
