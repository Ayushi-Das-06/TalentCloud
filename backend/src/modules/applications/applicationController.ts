import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';

export async function submitApplication(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Only freelancers can submit proposals' });
    }

    const { projectId, coverLetter, proposedBudget, estimatedDays } = req.body;

    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Freelancer profile not found' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    if (project.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: 'This project is no longer accepting applications' });
    }

    if (project.deadline && new Date() > new Date(project.deadline)) {
      return res.status(400).json({ success: false, error: 'The application deadline has passed' });
    }

    // Check for existing application
    const existing = await prisma.application.findUnique({
      where: {
        projectId_freelancerProfileId: {
          projectId,
          freelancerProfileId: profile.id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'You have already applied to this project' });
    }

    const application = await prisma.application.create({
      data: {
        projectId,
        freelancerProfileId: profile.id,
        coverLetter,
        proposedBudget: Number(proposedBudget),
        estimatedDays: parseInt(estimatedDays, 10),
        status: 'PENDING',
      },
    });

    // Notify project client
    const projectWithClient = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (projectWithClient) {
      await prisma.notification.create({
        data: {
          userId: projectWithClient.client.userId,
          title: 'New Application Received',
          message: `A new proposal was submitted for "${project.title}".`,
          type: 'APPLICATION_RECEIVED',
          link: `/client/projects/${projectId}/applications`,
        },
      });
    }

    return res.status(201).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
}

export async function getFreelancerApplications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const applications = await prisma.application.findMany({
      where: { freelancerProfileId: profile.id },
      include: {
        project: {
          include: {
            client: { include: { user: { select: { name: true, avatarUrl: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
}

export async function getProjectApplications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Client access required' });
    }

    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (project.client.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You are not authorized to view applications for this project' });
    }

    const applications = await prisma.application.findMany({
      where: { projectId },
      include: {
        freelancerProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            skills: { include: { skill: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: applications });
  } catch (err) {
    next(err);
  }
}

export async function withdrawApplication(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const { id } = req.params;
    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

    if (application.freelancerProfileId !== profile.id) {
      return res.status(403).json({ success: false, error: 'You cannot withdraw an application you do not own' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Only pending applications can be withdrawn' });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
