import { Router } from 'express';
import { submitReview, getUserReviews } from './reviewController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, submitReview);
router.get('/user/:userId', getUserReviews);

export default router;
