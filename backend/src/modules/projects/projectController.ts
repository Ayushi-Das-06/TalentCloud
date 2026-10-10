import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';
import { normalizeSkill } from '../intelligent/matchingEngine.js';

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      search,
      category,
      skill,
      level,
      minBudget,
      maxBudget,
      status = 'OPEN',
      page = '1',
      limit = '10',
      sortBy = 'newest',
    } = req.query;

    const pageNum = Number(page);
    const requestedLimit = Number(limit);
    if (!Number.isInteger(pageNum) || pageNum < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return res.status(400).json({ success: false, error: 'Page and limit must be positive integers' });
    }
    const take = Math.min(50, requestedLimit);
    const skip = (pageNum - 1) * take;

    const requester = req.user;
    const allowedStatuses = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ALL'];
    if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid project status filter' });
    }
    const canSeePrivate = requester?.role === 'ADMIN' || requester?.role === 'CLIENT';
    const where: any = {};
    if (status === 'ALL' && canSeePrivate) {
      if (requester?.role === 'CLIENT') where.clientId = requester.clientProfileId;
    } else if (status === 'OPEN' || !canSeePrivate) {
      where.status = 'OPEN';
    } else {
      where.status = status;
      if (requester?.role === 'CLIENT') where.clientId = requester.clientProfileId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category as string;
    }

    if (level) {
      where.experienceLevel = level as any;
    }

    if (minBudget) {
      where.minBudget = { gte: parseFloat(minBudget as string) };
    }

    if (maxBudget) {
      where.maxBudget = { lte: parseFloat(maxBudget as string) };
    }

    if (skill) {
      const normalized = normalizeSkill(skill as string);
      where.skills = {
        some: { skill: { normalizedName: normalized } },
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'budget_high') orderBy = { maxBudget: 'desc' };
    else if (sortBy === 'budget_low') orderBy = { minBudget: 'asc' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        include: {
          client: {
            include: { user: { select: { name: true, avatarUrl: true } } },
          },
          skills: { include: { skill: true } },
          _count: { select: { applications: true } },
        },
        orderBy,
      }),
      prisma.project.count({ where }),
    ]);

    return res.json({
      success: true,
      data: projects,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        skills: { include: { skill: true } },
        _count: { select: { applications: true, tasks: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const requester = req.user;
    const isClientOwner = requester?.role === 'CLIENT' && requester.clientProfileId === project.clientId;
    const isAdmin = requester?.role === 'ADMIN';
    if (project.status !== 'OPEN' && !isClientOwner && !isAdmin) {
      const hasContractAccess = requester?.role === 'FREELANCER' && requester.freelancerProfileId
        ? !!(await prisma.contract.findFirst({
            where: { projectId: project.id, freelancerProfileId: requester.freelancerProfileId },
            select: { id: true },
          }))
        : false;
      if (!hasContractAccess) return res.status(404).json({ success: false, error: 'Project not found' });
    }

    let contracts: Awaited<ReturnType<typeof prisma.contract.findMany>> = [];
    if (requester?.role === 'ADMIN' || isClientOwner || requester?.role === 'FREELANCER') {
      const where = {
        projectId: project.id,
        ...(requester.role === 'FREELANCER' ? { freelancerProfileId: requester.freelancerProfileId || '__none__' } : {}),
      };
      contracts = await prisma.contract.findMany({
        where,
        include: {
          freelancer: { include: { user: { select: { name: true, avatarUrl: true } } } },
        },
      });
    }

    return res.json({ success: true, data: { ...project, contracts } });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Only clients can create projects' });
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client profile not found' });
    }

    const {
      title,
      description,
      category,
      experienceLevel,
      minBudget,
      maxBudget,
      currency = 'USD',
      estimatedDurationDays,
      complexity,
      expectedDeliverables,
      deadline,
      skills = [],
    } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          clientId: client.id,
          title,
          description,
          category,
          experienceLevel: experienceLevel || 'INTERMEDIATE',
          minBudget: Number(minBudget),
          maxBudget: Number(maxBudget),
          currency,
          estimatedDurationDays: Number(estimatedDurationDays || 30),
          complexity: complexity || 'MEDIUM',
          expectedDeliverables,
          deadline: deadline ? new Date(deadline) : null,
          status: 'OPEN',
        },
      });

      // Link skills
      for (const skillName of skills) {
        const normalized = normalizeSkill(skillName);
        let s = await tx.skill.findUnique({ where: { normalizedName: normalized } });
        if (!s) {
          s = await tx.skill.create({
            data: { name: normalized, normalizedName: normalized, category },
          });
        }
        await tx.projectSkill.create({
          data: { projectId: created.id, skillId: s.id },
        });
      }

      return created;
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: { skills: { include: { skill: true } } },
    });

    return res.status(201).json({ success: true, data: fullProject });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Client access required' });
    }

    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (project.client.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You do not own this project' });
    }

    const { title, description, category, minBudget, maxBudget, status, deadline } = req.body;
    const effectiveMinBudget = minBudget === undefined ? Number(project.minBudget) : Number(minBudget);
    const effectiveMaxBudget = maxBudget === undefined ? Number(project.maxBudget) : Number(maxBudget);
    if (effectiveMinBudget > effectiveMaxBudget) {
      return res.status(400).json({ success: false, error: 'Minimum budget cannot exceed maximum budget' });
    }
    if (status !== undefined && (status !== 'CANCELLED' || project.status !== 'OPEN')) {
      return res.status(400).json({ success: false, error: 'Only open projects can be cancelled here; hiring and completion manage other state changes' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title,
        description,
        category,
        minBudget: minBudget === undefined ? undefined : Number(minBudget),
        maxBudget: maxBudget === undefined ? undefined : Number(maxBudget),
        status: status as any,
        deadline: deadline ? new Date(deadline) : undefined,
      },
      include: { skills: { include: { skill: true } } },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function getClientProjects(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Client access required' });
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!client) return res.status(404).json({ success: false, error: 'Client profile not found' });

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      include: {
        skills: { include: { skill: true } },
        _count: { select: { applications: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
}
