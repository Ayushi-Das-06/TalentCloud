import { Router } from 'express';
import { hireFreelancer, completeContract, getContracts } from './hiringController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const hireSchema = z.object({ applicationId: z.string().uuid() });

router.post('/hire', authenticateToken, requireRole(['CLIENT']), validateBody(hireSchema), hireFreelancer);
router.post('/complete/:contractId', authenticateToken, requireRole(['CLIENT']), validateParams(z.object({ contractId: z.string().uuid() })), completeContract);
router.get('/', authenticateToken, getContracts);

export default router;
