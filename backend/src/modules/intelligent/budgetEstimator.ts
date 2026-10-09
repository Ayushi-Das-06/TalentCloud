export interface ProjectEstimateInput {
  category: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  tasksCount?: number;
  skillsCount?: number;
}

export interface ProjectEstimateResult {
  suggestedBudgetMin: number;
  suggestedBudgetMax: number;
  currency: string;
  suggestedDurationDaysMin: number;
  suggestedDurationDaysMax: number;
  confidence: 'HIGH' | 'MEDIUM' | 'ESTIMATED';
  factors: {
    baseRatePerHour: number;
    estimatedHoursMin: number;
    estimatedHoursMax: number;
    complexityMultiplier: number;
    experienceMultiplier: number;
  };
  assumptions: string[];
}

export function estimateBudgetAndTimeline(input: ProjectEstimateInput): ProjectEstimateResult {
  // Category Baseline Rates per Hour (USD)
  const categoryRates: Record<string, number> = {
    'Web Development': 45,
    'Mobile Development': 55,
    'Cloud / DevOps': 65,
    'AI / Data Science': 70,
    'UI/UX Design': 40,
    General: 40,
  };

  const baseRate = categoryRates[input.category] || categoryRates.General;

  // Complexity Multipliers
  const complexityMultipliers = {
    LOW: 1.0,
    MEDIUM: 1.4,
    HIGH: 2.1,
  };

  // Experience Multipliers
  const experienceMultipliers = {
    ENTRY: 0.8,
    INTERMEDIATE: 1.2,
    EXPERT: 1.8,
  };

  const complexityMult = complexityMultipliers[input.complexity] || 1.4;
  const expMult = experienceMultipliers[input.experienceLevel] || 1.2;

  // Estimated Hours Calculation based on Scope & Tasks
  const taskVolume = Math.max(1, input.tasksCount || 4);
  const skillFactor = Math.max(1, input.skillsCount || 3);

  // Baseline 12 hours per core deliverable task, adjusted by skills & complexity
  const baselineHours = taskVolume * 12 + skillFactor * 4;
  const estimatedHoursMin = Math.round(baselineHours * complexityMult * 0.85);
  const estimatedHoursMax = Math.round(baselineHours * complexityMult * 1.35);

  const effectiveHourlyRate = Math.round(baseRate * expMult);

  const suggestedBudgetMin = Math.round((estimatedHoursMin * effectiveHourlyRate) / 50) * 50;
  const suggestedBudgetMax = Math.round((estimatedHoursMax * effectiveHourlyRate) / 50) * 50;

  // Timeline (assuming ~25-30 productive project hours per week / 5 hours per day)
  const daysMin = Math.max(5, Math.round(estimatedHoursMin / 5));
  const daysMax = Math.max(daysMin + 5, Math.round(estimatedHoursMax / 4));

  const assumptions: string[] = [
    `Assumes an effective delivery velocity of ~5 productive project hours/day for ${input.experienceLevel.toLowerCase()}-level talent.`,
    `Standard ${input.complexity.toLowerCase()} architectural complexity with ${taskVolume} major milestone tasks.`,
    `Base rate benchmark for ${input.category || 'General'} set at $${baseRate}/hr adjusted for requested expertise level.`,
  ];

  return {
    suggestedBudgetMin,
    suggestedBudgetMax,
    currency: 'USD',
    suggestedDurationDaysMin: daysMin,
    suggestedDurationDaysMax: daysMax,
    confidence: input.tasksCount && input.skillsCount ? 'HIGH' : 'MEDIUM',
    factors: {
      baseRatePerHour: effectiveHourlyRate,
      estimatedHoursMin,
      estimatedHoursMax,
      complexityMultiplier: complexityMult,
      experienceMultiplier: expMult,
    },
    assumptions,
  };
}
