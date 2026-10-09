import { normalizeSkill } from './matchingEngine.js';

// Skill family relationships to suggest bridge competencies
export const SKILL_RELATIONSHIPS: Record<string, string[]> = {
  JavaScript: ['TypeScript', 'Node.js', 'React'],
  TypeScript: ['JavaScript', 'Next.js', 'NestJS'],
  React: ['Next.js', 'Vue.js', 'Tailwind CSS', 'Redux'],
  'Node.js': ['Express.js', 'Fastify', 'NestJS', 'PostgreSQL'],
  PostgreSQL: ['MySQL', 'Prisma', 'Redis', 'SQL'],
  Python: ['FastAPI', 'Django', 'Data Analysis', 'Flask'],
  Docker: ['Kubernetes', 'CI/CD', 'Linux', 'AWS'],
  AWS: ['CloudWatch', 'Docker', 'Terraform', 'Lambda'],
};

export interface SkillGapAnalysisResult {
  targetTitle: string;
  matchedSkills: string[];
  missingSkills: string[];
  bridgeSkills: { missing: string; relatedKnown: string }[];
  matchPercentage: number;
  recommendations: string[];
  inDemandMarketSkills: string[];
}

export function analyzeSkillGap(
  candidateSkills: string[],
  requiredSkills: string[],
  targetTitle = 'Target Role / Project'
): SkillGapAnalysisResult {
  const normalizedCandidate = new Set(candidateSkills.map(normalizeSkill));
  const normalizedRequired = requiredSkills.map(normalizeSkill);

  const matched: string[] = [];
  const missing: string[] = [];
  const bridge: { missing: string; relatedKnown: string }[] = [];

  for (const req of normalizedRequired) {
    if (normalizedCandidate.has(req)) {
      matched.push(req);
    } else {
      missing.push(req);
      // Check if candidate knows a related bridge skill
      for (const known of normalizedCandidate) {
        const related = SKILL_RELATIONSHIPS[known] || [];
        if (related.map(normalizeSkill).includes(req)) {
          bridge.push({ missing: req, relatedKnown: known });
          break;
        }
      }
    }
  }

  const matchPercentage =
    normalizedRequired.length > 0
      ? Math.round((matched.length / normalizedRequired.length) * 100)
      : 100;

  const recommendations: string[] = [];
  if (missing.length === 0) {
    recommendations.push('You possess 100% of the requested technical skills for this project.');
  } else {
    recommendations.push(
      `Prioritize learning ${missing.slice(0, 2).join(' and ')} to become a prime candidate.`
    );
    if (bridge.length > 0) {
      recommendations.push(
        `Your experience in ${bridge[0].relatedKnown} offers a strong foundation to quickly pick up ${bridge[0].missing}.`
      );
    }
  }

  return {
    targetTitle,
    matchedSkills: matched,
    missingSkills: missing,
    bridgeSkills: bridge,
    matchPercentage,
    recommendations,
    inDemandMarketSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Tailwind CSS'],
  };
}
