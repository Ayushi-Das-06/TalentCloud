import { Router } from 'express';
import { hireFreelancer, completeContract, getContracts } from './hiringController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

router.post('/hire', authenticateToken, requireRole(['CLIENT']), hireFreelancer);
router.post('/complete/:contractId', authenticateToken, requireRole(['CLIENT']), completeContract);
router.get('/', authenticateToken, getContracts);

export default router;
