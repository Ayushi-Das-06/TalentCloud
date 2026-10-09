import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';

export async function getProjectTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
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

    // Verify authorized member (client or active freelancer)
    const isClientOwner = project.client.userId === req.user.id;
    const isFreelancer = project.contracts.some((c) => c.freelancerProfileId === req.user?.freelancerProfileId);

    if (!isClientOwner && !isFreelancer && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'You are not a member of this project' });
    }

    const contract = project.contracts[0];

    const task = await prisma.task.create({
      data: {
        projectId,
        contractId: contract?.id,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToProfileId: assignedToProfileId || (isFreelancer ? req.user.freelancerProfileId : contract?.freelancerProfileId),
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
      include: { project: { include: { client: true } }, assignedToProfile: true },
    });

    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    await prisma.task.delete({ where: { id: taskId } });
    return res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}
