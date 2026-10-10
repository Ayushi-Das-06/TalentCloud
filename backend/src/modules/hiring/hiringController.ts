import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';

export async function hireFreelancer(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Only clients can accept proposals and hire' });
    }

    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'Application ID is required' });
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!client) return res.status(404).json({ success: false, error: 'Client profile not found' });

    // Fetch application with project
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
        freelancerProfile: { include: { user: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    if (application.project.clientId !== client.id) {
      return res.status(403).json({ success: false, error: 'You are not the owner of this project' });
    }

    if (application.project.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        error: `Cannot hire for this project. Current status is ${application.project.status}`,
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: `This proposal is no longer pending (Current status: ${application.status})`,
      });
    }

    // Execute atomic transaction for contract creation, application acceptance, and state transitions
    const result = await prisma.$transaction(async (tx) => {
      const projectClaim = await tx.project.updateMany({
        where: { id: application.projectId, status: 'OPEN' },
        data: { status: 'IN_PROGRESS' },
      });
      if (projectClaim.count !== 1) return null;

      // 1. Create contract
      const contract = await tx.contract.create({
        data: {
          projectId: application.projectId,
          applicationId: application.id,
          clientId: client.id,
          freelancerProfileId: application.freelancerProfileId,
          agreedBudget: application.proposedBudget,
          currency: application.project.currency,
          status: 'ACTIVE',
        },
      });

      // 2. Accept this application
      await tx.application.update({
        where: { id: application.id },
        data: { status: 'ACCEPTED' },
      });

      // 3. Reject all other competing applications for this project
      const competing = await tx.application.findMany({
        where: {
          projectId: application.projectId,
          id: { not: application.id },
          status: 'PENDING',
        },
        include: { freelancerProfile: true },
      });

      await tx.application.updateMany({
        where: {
          projectId: application.projectId,
          id: { not: application.id },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      });

      // 4. Create default kick-off task
      await tx.task.create({
        data: {
          projectId: application.projectId,
          contractId: contract.id,
          title: 'Initial Project Kick-Off & Alignment',
          description: 'Review project requirements, clarify deliverables, and agree on milestones.',
          assignedToProfileId: application.freelancerProfileId,
          createdByUserId: req.user!.id,
          priority: 'HIGH',
          status: 'TODO',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        },
      });

      // 5. Notify hired freelancer
      await tx.notification.create({
        data: {
          userId: application.freelancerProfile.userId,
          title: 'Proposal Accepted! You are Hired!',
          message: `Congratulations! ${client.companyName || 'The client'} has accepted your proposal for "${application.project.title}".`,
          type: 'HIRED',
          link: `/workspace/projects/${application.projectId}`,
        },
      });

      // 6. Notify competing candidates
      for (const comp of competing) {
        await tx.notification.create({
          data: {
            userId: comp.freelancerProfile.userId,
            title: 'Project Proposal Update',
            message: `Another proposal was selected for "${application.project.title}". Thank you for applying.`,
            type: 'APPLICATION_REJECTED',
            link: `/freelancer/applications`,
          },
        });
      }

      return contract;
    });

    if (!result) {
      return res.status(409).json({ success: false, error: 'Another proposal was already selected for this project' });
    }

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function completeContract(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Only clients can mark projects completed' });
    }

    const { contractId } = req.params;
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!client) return res.status(404).json({ success: false, error: 'Client profile not found' });

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { project: true, freelancer: true },
    });

    if (!contract || contract.clientId !== client.id) {
      return res.status(403).json({ success: false, error: 'Contract not found or not owned by you' });
    }

    if (contract.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Contract is not currently active' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Complete contract
      await tx.contract.update({
        where: { id: contractId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // 2. Complete project
      await tx.project.update({
        where: { id: contract.projectId },
        data: { status: 'COMPLETED' },
      });

      // 3. Increment freelancer completed count
      await tx.freelancerProfile.update({
        where: { id: contract.freelancerProfileId },
        data: { completedProjectsCount: { increment: 1 } },
      });

      // 4. Notify freelancer
      await tx.notification.create({
        data: {
          userId: contract.freelancer.userId,
          title: 'Project Successfully Completed',
          message: `The project "${contract.project.title}" has been marked as completed!`,
          type: 'PROJECT_COMPLETED',
          link: `/workspace/projects/${contract.projectId}`,
        },
      });
    });

    return res.json({ success: true, message: 'Contract completed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getContracts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const where: any = {};
    if (req.user.role === 'CLIENT') {
      const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
      where.clientId = client.id;
    } else if (req.user.role === 'FREELANCER') {
      const freelancer = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
      if (!freelancer) return res.status(404).json({ success: false, error: 'Freelancer not found' });
      where.freelancerProfileId = freelancer.id;
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        project: true,
        client: { include: { user: { select: { name: true, email: true, avatarUrl: true } } } },
        freelancer: { include: { user: { select: { name: true, email: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: contracts });
  } catch (err) {
    next(err);
  }
}
