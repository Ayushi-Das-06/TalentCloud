import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';
import { normalizeSkill } from '../intelligent/matchingEngine.js';

export async function getFreelancers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, skill, level, availability, page = '1', limit = '12' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * take;

    const where: any = {
      user: { isSuspended: false },
    };

    if (search) {
      where.OR = [
        { headline: { contains: search as string, mode: 'insensitive' } },
        { bio: { contains: search as string, mode: 'insensitive' } },
        { user: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    if (level) {
      where.experienceLevel = level as any;
    }

    if (availability) {
      where.availability = availability as any;
    }

    if (skill) {
      const normalized = normalizeSkill(skill as string);
      where.skills = {
        some: {
          skill: { normalizedName: normalized },
        },
      };
    }

    const [freelancers, total] = await Promise.all([
      prisma.freelancerProfile.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          skills: { include: { skill: true } },
        },
        orderBy: [{ averageRating: 'desc' }, { completedProjectsCount: 'desc' }],
      }),
      prisma.freelancerProfile.count({ where }),
    ]);

    return res.json({
      success: true,
      data: freelancers,
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

export async function getFreelancerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const profile = await prisma.freelancerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
        skills: { include: { skill: true } },
        contracts: {
          where: { status: 'COMPLETED' },
          include: { project: { select: { title: true, category: true } } },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Freelancer profile not found' });
    }

    return res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

export async function updateFreelancerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Only freelancers can update this profile' });
    }

    const {
      headline,
      bio,
      experienceYears,
      experienceLevel,
      hourlyRate,
      availability,
      portfolioLinks,
      education,
      preferredCategories,
    } = req.body;

    // Calculate profile completion score
    let score = 30;
    if (headline) score += 15;
    if (bio && bio.length > 50) score += 20;
    if (hourlyRate) score += 15;
    if (portfolioLinks && (Array.isArray(portfolioLinks) ? portfolioLinks.length > 0 : true)) score += 10;
    if (education) score += 10;

    const updated = await prisma.freelancerProfile.update({
      where: { userId: req.user.id },
      data: {
        headline,
        bio,
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
        experienceLevel,
        hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : undefined,
        availability,
        portfolioLinks,
        education,
        preferredCategories,
        profileCompletion: Math.min(100, score),
      },
      include: {
        skills: { include: { skill: true } },
        user: { select: { name: true, email: true, avatarUrl: true } },
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function addFreelancerSkill(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const { skillName, yearsExperience = 1 } = req.body;
    if (!skillName) {
      return res.status(400).json({ success: false, error: 'Skill name is required' });
    }

    const normalized = normalizeSkill(skillName);

    // Find or create canonical skill
    let skill = await prisma.skill.findUnique({ where: { normalizedName: normalized } });
    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          name: normalized,
          normalizedName: normalized,
          category: 'Software Engineering',
        },
      });
    }

    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const freelancerSkill = await prisma.freelancerSkill.upsert({
      where: {
        freelancerProfileId_skillId: {
          freelancerProfileId: profile.id,
          skillId: skill.id,
        },
      },
      update: { yearsExperience: parseInt(yearsExperience, 10) },
      create: {
        freelancerProfileId: profile.id,
        skillId: skill.id,
        yearsExperience: parseInt(yearsExperience, 10),
      },
      include: { skill: true },
    });

    return res.status(201).json({ success: true, data: freelancerSkill });
  } catch (err) {
    next(err);
  }
}

export async function removeFreelancerSkill(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const { skillId } = req.params;
    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    await prisma.freelancerSkill.deleteMany({
      where: {
        freelancerProfileId: profile.id,
        skillId,
      },
    });

    return res.json({ success: true, message: 'Skill removed' });
  } catch (err) {
    next(err);
  }
}

export async function getClientProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const client = await prisma.clientProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, createdAt: true } },
        projects: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS', 'COMPLETED'] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client profile not found' });
    }

    return res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
}

export async function updateClientProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, error: 'Client access required' });
    }

    const { companyName, industry, description, website } = req.body;

    const updated = await prisma.clientProfile.update({
      where: { userId: req.user.id },
      data: { companyName, industry, description, website },
      include: { user: { select: { name: true, email: true, avatarUrl: true } } },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
