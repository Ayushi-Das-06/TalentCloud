import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';

const isProjectMember = (
  user: NonNullable<Request['user']>,
  project: { client: { userId: string }; contracts: { freelancerProfileId: string }[] },
) =>
  user.role === 'ADMIN' ||
  project.client.userId === user.id ||
  (!!user.freelancerProfileId && project.contracts.some((contract) => contract.freelancerProfileId === user.freelancerProfileId));

export async function getProjectTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: { select: { userId: true } }, contracts: { select: { freelancerProfileId: true } } },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (!isProjectMember(req.user, project)) return res.status(403).json({ success: false, error: 'Project access required' });

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignedToProfile: {
          include: { user: { select: { name: true, avatarUrl: true } } },
        },
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { projectId, title, description, priority = 'MEDIUM', dueDate, assignedToProfileId } = req.body;

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true, contracts: true },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (!isProjectMember(req.user, project)) {
      return res.status(403).json({ success: false, error: 'You are not authorized to create tasks for this project' });
    }

    // Verify authorized member (client or active freelancer)
    const isClientOwner = project.client.userId === req.user.id;
    const isFreelancer = project.contracts.some((c) => c.freelancerProfileId === req.user?.freelancerProfileId);

    if (!isClientOwner && !isFreelancer && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You are not a member of this project' });
    }

    const contract = project.contracts[0];
    const assignedProfileId = assignedToProfileId || (isFreelancer ? req.user.freelancerProfileId : contract?.freelancerProfileId);
    if (assignedProfileId && !project.contracts.some((item) => item.freelancerProfileId === assignedProfileId)) {
      return res.status(400).json({ success: false, error: 'Tasks can only be assigned to the hired freelancer' });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        contractId: contract?.id,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToProfileId: assignedProfileId,
        createdByUserId: req.user.id,
        status: 'TODO',
      },
      include: {
        assignedToProfile: { include: { user: { select: { name: true } } } },
      },
    });

    // Notify assigned user if different from creator
    if (task.assignedToProfile?.userId && task.assignedToProfile.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assignedToProfile.userId,
          title: 'New Task Assigned',
          message: `Task "${title}" has been assigned to you.`,
          type: 'TASK_ASSIGNED',
          link: `/workspace/projects/${projectId}/tasks`,
        },
      });
    }

    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { taskId } = req.params;
    const { status } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { client: { select: { userId: true } }, contracts: { select: { freelancerProfileId: true } } } },
        assignedToProfile: { select: { userId: true } },
      },
    });

    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    const clientOwner = task.project.client.userId === req.user.id;
    const assignedFreelancer = task.assignedToProfile?.userId === req.user.id;
    if (!clientOwner && !assignedFreelancer && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You are not authorized to update this task' });
    }
    const allowedStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const;
    if (typeof status !== 'string' || !(allowedStatuses as readonly string[]).includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid task status' });
    }
    const nextStatus = status as (typeof allowedStatuses)[number];
    const allowedTransitions: Record<string, string[]> = {
      TODO: ['IN_PROGRESS'],
      IN_PROGRESS: ['TODO', 'IN_REVIEW'],
      IN_REVIEW: ['IN_PROGRESS', 'COMPLETED'],
      COMPLETED: ['IN_PROGRESS'],
    };
    if (nextStatus !== task.status && !allowedTransitions[task.status]?.includes(nextStatus)) {
      return res.status(400).json({ success: false, error: `Cannot move task from ${task.status} to ${nextStatus}` });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status: nextStatus },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { client: { select: { userId: true } } } } },
    });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.project.client.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only the project owner can delete tasks' });
    }
    await prisma.task.delete({ where: { id: taskId } });
    return res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}
