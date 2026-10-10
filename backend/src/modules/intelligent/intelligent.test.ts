import { describe, it, expect } from 'vitest';
import { normalizeSkill, calculateMatch, CandidateProfile, TargetProject } from './matchingEngine.js';
import { extractSkillsFromText, parseResumeText } from './resumeParser.js';
import { analyzeSkillGap } from './skillGapAnalyzer.js';
import { estimateBudgetAndTimeline } from './budgetEstimator.js';
import JSZip from 'jszip';

describe('Intelligent Feature 1: Matching Engine & Skill Normalization', () => {
  it('correctly normalizes canonical skill aliases', () => {
    expect(normalizeSkill('js')).toBe('JavaScript');
    expect(normalizeSkill('typescript')).toBe('TypeScript');
    expect(normalizeSkill('node')).toBe('Node.js');
    expect(normalizeSkill('postgres')).toBe('PostgreSQL');
    expect(normalizeSkill('k8s')).toBe('Kubernetes');
    expect(normalizeSkill('py')).toBe('Python');
  });

  it('calculates weighted match scores with transparent breakdown', () => {
    const candidate: CandidateProfile = {
      id: 'c1',
      name: 'Alex Rivera',
      experienceYears: 7,
      experienceLevel: 'EXPERT',
      hourlyRate: 75,
      availability: 'FULL_TIME',
      averageRating: 4.9,
      completedProjectsCount: 12,
      skills: [
        { name: 'TypeScript' },
        { name: 'React' },
        { name: 'Node.js' },
        { name: 'PostgreSQL' },
      ],
    };

    const project: TargetProject = {
      id: 'p1',
      title: 'Cloud Telemetry System',
      category: 'Web Development',
      experienceLevel: 'EXPERT',
      minBudget: 3000,
      maxBudget: 5000,
      requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    };

    const result = calculateMatch(candidate, project);

    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.matchTier).toBe('Excellent Match');
    expect(result.componentScores.skillMatch).toBe(100);
    expect(result.matchedSkills).toEqual(['TypeScript', 'React', 'Node.js', 'PostgreSQL']);
    expect(result.missingSkills).toHaveLength(0);
    expect(result.explanations.length).toBeGreaterThan(0);
  });

  it('handles partial skill matches gracefully without penalizing junior candidates unfairly', () => {
    const candidate: CandidateProfile = {
      id: 'c2',
      name: 'New Developer',
      experienceYears: 1,
      experienceLevel: 'ENTRY',
      availability: 'PART_TIME',
      averageRating: 0,
      completedProjectsCount: 0,
      skills: [{ name: 'JavaScript' }],
    };

    const project: TargetProject = {
      id: 'p2',
      title: 'Python Machine Learning Pipeline',
      category: 'AI / Data Science',
      experienceLevel: 'EXPERT',
      minBudget: 2000,
      maxBudget: 4000,
      requiredSkills: ['Python', 'Docker', 'FastAPI'],
    };

    const result = calculateMatch(candidate, project);
    expect(result.overallScore).toBeLessThan(60);
    expect(result.matchTier).toBe('Partial Match');
    expect(result.missingSkills).toContain('Python');
  });
});

describe('Intelligent Feature 2: Resume Parser & Keyword Extractor', () => {
  it('reads text files and rejects formats without a parser', async () => {
    const content = Buffer.from('TypeScript and React');
    await expect(parseResumeText(content, 'text/plain')).resolves.toBe('TypeScript and React');
    await expect(parseResumeText(content, 'image/png')).rejects.toThrow('Unsupported resume format');
  });

  it('extracts paragraph text and XML entities from DOCX content', async () => {
    const archive = new JSZip();
    archive.file(
      'word/document.xml',
      '<w:document xmlns:w="urn:test"><w:body><w:p><w:r><w:t>TypeScript &amp; React</w:t></w:r></w:p></w:body></w:document>',
    );
    const docx = await archive.generateAsync({ type: 'nodebuffer' });
    await expect(
      parseResumeText(docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).resolves.toBe('TypeScript & React');
  });

  it('extracts known skills and calculates confidence scores', () => {
    const sampleResumeText = `
      John Doe - Senior Software Engineer
      Extensive background in TypeScript, React, and Node.js microservices.
      Managed scalable PostgreSQL clusters and deployed multi-container apps using Docker and AWS.
      Proficient in Git, CI/CD pipelines, and Agile delivery.
    `;

    const result = extractSkillsFromText(sampleResumeText);
    const skillNames = result.extractedSkills.map((s) => s.skill);

    expect(skillNames).toContain('TypeScript');
    expect(skillNames).toContain('React');
    expect(skillNames).toContain('Node.js');
    expect(skillNames).toContain('PostgreSQL');
    expect(skillNames).toContain('Docker');
    expect(skillNames).toContain('AWS');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
    expect(result.suggestedRoles.length).toBeGreaterThan(0);
  });
});

describe('Intelligent Feature 3: Skill-Gap Analysis', () => {
  it('identifies matched, missing, and bridge skills', () => {
    const candidateSkills = ['JavaScript', 'React', 'Node.js'];
    const projectRequirements = ['TypeScript', 'React', 'Docker'];

    const result = analyzeSkillGap(candidateSkills, projectRequirements, 'Target Role');

    expect(result.matchedSkills).toContain('React');
    expect(result.missingSkills).toContain('TypeScript');
    expect(result.missingSkills).toContain('Docker');
    expect(result.bridgeSkills.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Intelligent Feature 4: Smart Budget and Timeline Estimator', () => {
  it('generates explainable budget ranges and duration estimates', () => {
    const estimate = estimateBudgetAndTimeline({
      category: 'Web Development',
      complexity: 'HIGH',
      experienceLevel: 'EXPERT',
      tasksCount: 5,
      skillsCount: 4,
    });

    expect(estimate.suggestedBudgetMin).toBeGreaterThan(1000);
    expect(estimate.suggestedBudgetMax).toBeGreaterThan(estimate.suggestedBudgetMin);
    expect(estimate.suggestedDurationDaysMin).toBeGreaterThanOrEqual(10);
    expect(estimate.suggestedDurationDaysMax).toBeGreaterThan(estimate.suggestedDurationDaysMin);
    expect(estimate.assumptions.length).toBeGreaterThan(0);
    expect(estimate.factors.complexityMultiplier).toBe(2.1);
  });
});
