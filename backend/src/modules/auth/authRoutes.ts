import { Router } from 'express';
import { register, login, getMe, logout, registerSchema, loginSchema } from './authController.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticateToken, getMe);
router.post('/logout', logout);

export default router;
