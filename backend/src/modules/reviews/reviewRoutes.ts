import { Router } from 'express';
import { submitReview, getUserReviews } from './reviewController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const reviewSchema = z.object({
  projectId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().trim().min(3).max(2000),
});

router.post('/', authenticateToken, validateBody(reviewSchema), submitReview);
router.get('/user/:userId', validateParams(z.object({ userId: z.string().uuid() })), getUserReviews);

export default router;
