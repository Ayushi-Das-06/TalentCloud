import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { calculateMatch, CandidateProfile, TargetProject } from './matchingEngine.js';
import { analyzeSkillGap } from './skillGapAnalyzer.js';
import { estimateBudgetAndTimeline } from './budgetEstimator.js';

export const estimateSchema = z.object({
  category: z.string().trim().min(1).max(80).default('Web Development'),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  experienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).default('INTERMEDIATE'),
  tasksCount: z.coerce.number().int().min(1).max(100).optional(),
  skillsCount: z.coerce.number().int().min(1).max(100).optional(),
});

function toExperienceLevel(value: string): CandidateProfile['experienceLevel'] {
  return value === 'ENTRY' || value === 'EXPERT' ? value : 'INTERMEDIATE';
}

function toAvailability(value: string): CandidateProfile['availability'] {
  return value === 'PART_TIME' || value === 'NOT_AVAILABLE' ? value : 'FULL_TIME';
}

export async function matchFreelancersForProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        skills: { include: { skill: true } },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (req.user?.role !== 'ADMIN' && project.clientId !== req.user?.clientProfileId) {
      return res.status(403).json({ success: false, error: 'You are not authorized to view matches for this project' });
    }

    const targetProject: TargetProject = {
      id: project.id,
      title: project.title,
      category: project.category,
      experienceLevel: toExperienceLevel(project.experienceLevel),
      minBudget: Number(project.minBudget),
      maxBudget: Number(project.maxBudget),
      requiredSkills: project.skills.map((s) => s.skill.name),
    };

    // Fetch candidate freelancers
    const freelancers = await prisma.freelancerProfile.findMany({
      where: { user: { isSuspended: false } },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        skills: { include: { skill: true } },
      },
    });

    const results = freelancers.map((f) => {
      const candidate: CandidateProfile = {
        id: f.id,
        name: f.user.name,
        headline: f.headline,
        experienceYears: f.experienceYears,
        experienceLevel: toExperienceLevel(f.experienceLevel),
        hourlyRate: f.hourlyRate ? Number(f.hourlyRate) : null,
        availability: toAvailability(f.availability),
        averageRating: Number(f.averageRating),
        completedProjectsCount: f.completedProjectsCount,
        skills: f.skills.map((s) => ({
          name: s.skill.name,
          yearsExperience: s.yearsExperience,
        })),
      };

      const match = calculateMatch(candidate, targetProject);
      return {
        ...match,
        freelancer: {
          id: f.id,
          userId: f.userId,
          name: f.user.name,
          headline: f.headline,
          avatarUrl: f.user.avatarUrl,
          experienceLevel: f.experienceLevel,
          hourlyRate: f.hourlyRate,
          availability: f.availability,
          averageRating: f.averageRating,
          completedProjectsCount: f.completedProjectsCount,
        },
      };
    });

    // Sort descending by overall match score
    results.sort((a, b) => b.overallScore - a.overallScore);

    return res.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        requiredSkills: targetProject.requiredSkills,
      },
      matches: results,
    });
  } catch (err) {
    next(err);
  }
}

export async function matchProjectsForFreelancer(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const freelancer = await prisma.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { name: true } },
        skills: { include: { skill: true } },
      },
    });

    if (!freelancer) return res.status(404).json({ success: false, error: 'Freelancer profile not found' });

    const candidate: CandidateProfile = {
      id: freelancer.id,
      name: freelancer.user.name,
      headline: freelancer.headline,
      experienceYears: freelancer.experienceYears,
      experienceLevel: toExperienceLevel(freelancer.experienceLevel),
      hourlyRate: freelancer.hourlyRate ? Number(freelancer.hourlyRate) : null,
      availability: toAvailability(freelancer.availability),
      averageRating: Number(freelancer.averageRating),
      completedProjectsCount: freelancer.completedProjectsCount,
      skills: freelancer.skills.map((s) => ({ name: s.skill.name })),
    };

    const openProjects = await prisma.project.findMany({
      where: { status: 'OPEN' },
      include: {
        client: { include: { user: { select: { name: true } } } },
        skills: { include: { skill: true } },
      },
    });

    const recommendations = openProjects.map((p) => {
      const targetProject: TargetProject = {
        id: p.id,
        title: p.title,
        category: p.category,
        experienceLevel: toExperienceLevel(p.experienceLevel),
        minBudget: Number(p.minBudget),
        maxBudget: Number(p.maxBudget),
        requiredSkills: p.skills.map((s) => s.skill.name),
      };

      const match = calculateMatch(candidate, targetProject);
      return {
        ...match,
        project: p,
      };
    });

    recommendations.sort((a, b) => b.overallScore - a.overallScore);

    return res.json({ success: true, recommendations });
  } catch (err) {
    next(err);
  }
}

export async function getSkillGapAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const { projectId, targetSkills } = req.body;

    const freelancer = await prisma.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      include: { skills: { include: { skill: true } } },
    });

    if (!freelancer) return res.status(404).json({ success: false, error: 'Freelancer profile not found' });

    const candidateSkills = freelancer.skills.map((s) => s.skill.name);
    let requiredSkills: string[] = [];
    let title = 'Selected Role Requirements';

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { skills: { include: { skill: true } } },
      });
      if (project) {
        title = project.title;
        requiredSkills = project.skills.map((s) => s.skill.name);
      }
    } else if (Array.isArray(targetSkills)) {
      requiredSkills = targetSkills;
    } else {
      // Default industry benchmark
      requiredSkills = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'];
      title = 'Full-Stack Cloud Engineer Benchmark';
    }

    const analysis = analyzeSkillGap(candidateSkills, requiredSkills, title);

    return res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
}

export async function getEstimate(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, complexity, experienceLevel, tasksCount, skillsCount } = estimateSchema.parse(req.body);

    const estimate = estimateBudgetAndTimeline({
      category: category || 'Web Development',
      complexity: complexity || 'MEDIUM',
      experienceLevel: experienceLevel || 'INTERMEDIATE',
      tasksCount,
      skillsCount,
    });

    return res.json({ success: true, data: estimate });
  } catch (err) {
    next(err);
  }
}
