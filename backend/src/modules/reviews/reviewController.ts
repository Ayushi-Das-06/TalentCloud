import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';

export async function submitReview(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { projectId, revieweeId, rating, feedback } = req.body;
    const numRating = Number(rating);

    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        contracts: { include: { freelancer: true } },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (project.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Reviews can only be submitted for completed projects' });
    }

    const contract = project.contracts[0];
    if (!contract) return res.status(400).json({ success: false, error: 'A completed contract is required before reviewing' });
    const freelancerUserId = contract.freelancer.userId;
    const participants = new Set([project.client.userId, freelancerUserId]);
    if (
      !participants.has(req.user.id) ||
      typeof revieweeId !== 'string' ||
      !participants.has(revieweeId) ||
      revieweeId === req.user.id
    ) {
      return res.status(403).json({ success: false, error: 'Only project participants can review one another' });
    }
    if (typeof feedback !== 'string' || feedback.trim().length < 3 || feedback.length > 2000) {
      return res.status(400).json({ success: false, error: 'Feedback must be between 3 and 2000 characters' });
    }

    // Check duplicate
    const existing = await prisma.review.findUnique({
      where: {
        projectId_reviewerId_revieweeId: {
          projectId,
          reviewerId: req.user.id,
          revieweeId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already submitted a review for this project' });
    }

    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          projectId,
          reviewerId: req.user!.id,
          revieweeId,
          rating: numRating,
          feedback,
        },
      });

      // Recalculate average rating for reviewee if freelancer
      const freelancerProfile = await tx.freelancerProfile.findUnique({
        where: { userId: revieweeId },
      });

      if (freelancerProfile) {
        const allReviews = await tx.review.findMany({
          where: { revieweeId },
          select: { rating: true },
        });

        const avg = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
        await tx.freelancerProfile.update({
          where: { id: freelancerProfile.id },
          data: { averageRating: Number(avg.toFixed(2)) },
        });
      }

      await tx.notification.create({
        data: {
          userId: revieweeId,
          title: 'New Review Received',
          message: `You received a ${numRating}-star rating for "${project.title}".`,
          type: 'REVIEW_RECEIVED',
          link: `/profile`,
        },
      });

      return createdReview;
    });

    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

export async function getUserReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}
