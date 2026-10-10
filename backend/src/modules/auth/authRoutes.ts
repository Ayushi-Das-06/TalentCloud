import { Router } from 'express';
import { register, login, getMe, logout, registerSchema, loginSchema } from './authController.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticateToken } from '../../middleware/auth.js';
import { authRateLimit } from '../../middleware/rateLimit.js';

const router = Router();

router.post('/register', authRateLimit, validateBody(registerSchema), register);
router.post('/login', authRateLimit, validateBody(loginSchema), login);
router.get('/me', authenticateToken, getMe);
router.post('/logout', logout);

export default router;
