import { config } from '../../config/index.js';

// Canonical Skill Dictionary and Aliases Mapping
export const SKILL_ALIASES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  node: 'Node.js',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  react: 'React',
  'react.js': 'React',
  reactjs: 'React',
  next: 'Next.js',
  nextjs: 'Next.js',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  psql: 'PostgreSQL',
  py: 'Python',
  python: 'Python',
  docker: 'Docker',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  aws: 'AWS',
  amazonwebservices: 'AWS',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  gql: 'GraphQL',
  graphql: 'GraphQL',
  mongo: 'MongoDB',
  mongodb: 'MongoDB',
  redis: 'Redis',
  git: 'Git',
  github: 'Git',
  ci_cd: 'CI/CD',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  terraform: 'Terraform',
  prisma: 'Prisma',
  express: 'Express.js',
  expressjs: 'Express.js',
};

export function normalizeSkill(skillName: string): string {
  const clean = skillName.trim().toLowerCase().replace(/[\s\-_]+/g, '');
  return SKILL_ALIASES[clean] || skillName.trim();
}

export interface CandidateProfile {
  id: string;
  name: string;
  headline?: string | null;
  experienceYears: number;
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  hourlyRate?: number | null;
  availability: 'FULL_TIME' | 'PART_TIME' | 'NOT_AVAILABLE';
  averageRating: number;
  completedProjectsCount: number;
  skills: { name: string; proficiency?: string; yearsExperience?: number }[];
}

export interface TargetProject {
  id: string;
  title: string;
  category: string;
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  minBudget: number;
  maxBudget: number;
  requiredSkills: string[];
}

export interface MatchResult {
  candidateId: string;
  candidateName: string;
  overallScore: number;
  matchTier: 'Excellent Match' | 'Good Match' | 'Partial Match';
  componentScores: {
    skillMatch: number;
    experienceMatch: number;
    pastPerformance: number;
    ratingMatch: number;
    availabilityMatch: number;
    budgetCompatibility: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  explanations: string[];
}

export function calculateMatch(candidate: CandidateProfile, project: TargetProject): MatchResult {
  const weights = config.matchingWeights;

  // 1. Skill Match (Weight: 40%)
  const normalizedCandidateSkills = new Set(candidate.skills.map((s) => normalizeSkill(s.name)));
  const normalizedProjectSkills = project.requiredSkills.map(normalizeSkill);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of normalizedProjectSkills) {
    if (normalizedCandidateSkills.has(skill)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const skillScore =
    normalizedProjectSkills.length > 0
      ? (matchedSkills.length / normalizedProjectSkills.length) * 100
      : 80; // Neutral if no explicit skills listed

  // 2. Experience Match (Weight: 20%)
  const levelOrder = { ENTRY: 1, INTERMEDIATE: 2, EXPERT: 3 };
  const candidateLevelScore = levelOrder[candidate.experienceLevel] || 2;
  const projectLevelScore = levelOrder[project.experienceLevel] || 2;

  let experienceScore = 100;
  if (candidateLevelScore === projectLevelScore) {
    experienceScore = 100;
  } else if (candidateLevelScore > projectLevelScore) {
    // Overqualified is still highly acceptable
    experienceScore = 95;
  } else {
    // Underqualified heuristic penalty
    const diff = projectLevelScore - candidateLevelScore;
    experienceScore = Math.max(30, 100 - diff * 35);
  }

  // 3. Past Performance (Weight: 15%)
  // Adjusted for new users: baseline 75 to avoid penalizing beginners
  let pastPerformanceScore = 75;
  if (candidate.completedProjectsCount > 0) {
    pastPerformanceScore = Math.min(100, 75 + candidate.completedProjectsCount * 5);
  }

  // 4. Rating (Weight: 10%)
  // Convert 0-5 to 0-100; unrated defaults to neutral 80
  let ratingScore = 80;
  if (candidate.averageRating > 0) {
    ratingScore = Math.min(100, (candidate.averageRating / 5) * 100);
  }

  // 5. Availability (Weight: 10%)
  let availabilityScore = 50;
  if (candidate.availability === 'FULL_TIME') availabilityScore = 100;
  else if (candidate.availability === 'PART_TIME') availabilityScore = 75;
  else availabilityScore = 20;

  // 6. Budget Compatibility (Weight: 5%)
  let budgetCompatibility = 85; // Baseline
  if (candidate.hourlyRate && candidate.hourlyRate > 0) {
    const estimatedProjectHourly = project.maxBudget / (project.minBudget > 0 ? 80 : 120);
    const ratio = candidate.hourlyRate / (estimatedProjectHourly || 50);
    if (ratio <= 1.1) budgetCompatibility = 100;
    else if (ratio <= 1.3) budgetCompatibility = 70;
    else budgetCompatibility = 40;
  }

  // Compute Total Weighted Score
  const totalWeight =
    weights.skill +
    weights.experience +
    weights.performance +
    weights.rating +
    weights.availability +
    weights.budget;

  const rawWeighted =
    skillScore * weights.skill +
    experienceScore * weights.experience +
    pastPerformanceScore * weights.performance +
    ratingScore * weights.rating +
    availabilityScore * weights.availability +
    budgetCompatibility * weights.budget;

  const overallScore = Math.round(rawWeighted / totalWeight);

  let matchTier: 'Excellent Match' | 'Good Match' | 'Partial Match' = 'Partial Match';
  if (overallScore >= 80) matchTier = 'Excellent Match';
  else if (overallScore >= 60) matchTier = 'Good Match';

  // Construct Explainable Rationales
  const explanations: string[] = [];
  if (matchedSkills.length > 0) {
    explanations.push(`Matches ${matchedSkills.length} of ${normalizedProjectSkills.length} required skills (${matchedSkills.slice(0, 3).join(', ')}).`);
  }
  if (missingSkills.length > 0) {
    explanations.push(`Skill gap identified: ${missingSkills.join(', ')}.`);
  }
  if (candidateLevelScore >= projectLevelScore) {
    explanations.push(`Meets or exceeds requested ${project.experienceLevel.toLowerCase()} experience level.`);
  }
  if (candidate.completedProjectsCount > 0) {
    explanations.push(`Proven delivery track record with ${candidate.completedProjectsCount} completed marketplace projects.`);
  }
  if (candidate.availability === 'FULL_TIME') {
    explanations.push(`Full-time availability allows immediate engagement.`);
  }

  return {
    candidateId: candidate.id,
    candidateName: candidate.name,
    overallScore,
    matchTier,
    componentScores: {
      skillMatch: Math.round(skillScore),
      experienceMatch: Math.round(experienceScore),
      pastPerformance: Math.round(pastPerformanceScore),
      ratingMatch: Math.round(ratingScore),
      availabilityMatch: Math.round(availabilityScore),
      budgetCompatibility: Math.round(budgetCompatibility),
    },
    matchedSkills,
    missingSkills,
    explanations,
  };
}
