import { Router } from 'express';
import {
  getSystemStats,
  getQueueDashboard,
  triggerBurstTest,
  retryFailedJob,
} from './adminController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();
const burstSchema = z.object({ count: z.coerce.number().int().min(1).max(50).default(5) });

router.use(authenticateToken, requireRole(['ADMIN']));
router.get('/stats', getSystemStats);
router.get('/queue', getQueueDashboard);
router.post('/queue/burst', validateBody(burstSchema), triggerBurstTest);
router.post('/queue/retry/:jobId', validateParams(z.object({ jobId: z.string().uuid() })), retryFailedJob);

export default router;
