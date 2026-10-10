import { normalizeSkill, SKILL_ALIASES } from './matchingEngine.js';

// Controlled dictionary of technical skills and categories
export const KNOWN_SKILLS = [
  'JavaScript', 'TypeScript', 'Node.js', 'React', 'Next.js', 'Vue.js', 'Angular',
  'Python', 'Django', 'Flask', 'FastAPI', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'Linux',
  'GraphQL', 'REST API', 'Tailwind CSS', 'HTML', 'CSS', 'Git', 'CI/CD',
  'Terraform', 'Prisma', 'Express.js', 'Jest', 'Mocha', 'Microservices',
  'Data Analysis', 'Machine Learning', 'DevOps', 'Agile', 'Scrum'
];

export interface ExtractedSkillResult {
  skill: string;
  confidence: number;
  occurrences: number;
}

export interface ResumeParsingResult {
  rawTextLength: number;
  extractedSkills: ExtractedSkillResult[];
  confidenceScore: number;
  suggestedRoles: string[];
  missingCommonSkills: string[];
}

export async function parseResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  // In case of plain text or markdown
  if (mimeType.includes('text') || mimeType.includes('plain')) {
    return buffer.toString('utf-8');
  }

  // Attempt PDF extraction
  if (mimeType.includes('pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    if (data?.text?.trim()) return data.text;
    throw new Error('The PDF did not contain extractable text.');
  }

  if (mimeType.includes('wordprocessingml.document')) {
    const JSZip = (await import('jszip')).default;
    const archive = await JSZip.loadAsync(buffer);
    const document = archive.file('word/document.xml');
    const uncompressedSize = (document as unknown as { _data?: { uncompressedSize?: number } } | null)?._data?.uncompressedSize;
    if (!document || (uncompressedSize !== undefined && uncompressedSize > 20 * 1024 * 1024)) {
      throw new Error('The DOCX document is missing its text body or exceeds the extraction limit.');
    }

    const xml = await document.async('string');
    const text = xml
      .replace(/<w:tab\b[^>]*\/?\s*>/g, '\t')
      .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/g, '\n')
      .replace(/<\/w:p\s*>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
        if (code.startsWith('#')) {
          const point = parseInt(code.slice(code.startsWith('#x') ? 2 : 1), code.startsWith('#x') ? 16 : 10);
          return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
        }
        return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[code.toLowerCase()];
      })
      .trim();
    if (text) return text;
    throw new Error('The DOCX document did not contain extractable text.');
  }

  throw new Error('Unsupported resume format. Upload a PDF, DOCX, or plain text file.');
}

export function extractSkillsFromText(text: string): ResumeParsingResult {
  const lowerText = text.toLowerCase();
  const wordTokens = lowerText.split(/[\s,.;:()\/\\\[\]{}|"\-]+/).filter(Boolean);
  const tokenSet = new Set(wordTokens);

  const matchedSkills: Map<string, { count: number; canonical: string }> = new Map();

  // 1. Check aliases and keywords
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    const regex = new RegExp(`\\b${alias.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(lowerText) || tokenSet.has(alias)) {
      const current = matchedSkills.get(canonical) || { count: 0, canonical };
      current.count += 1;
      matchedSkills.set(canonical, current);
    }
  }

  // 2. Check full known skills dictionary
  for (const skill of KNOWN_SKILLS) {
    const canonical = normalizeSkill(skill);
    const regex = new RegExp(`\\b${skill.toLowerCase().replace('.', '\\.')}\\b`, 'i');
    if (regex.test(lowerText)) {
      const current = matchedSkills.get(canonical) || { count: 0, canonical };
      current.count += 1;
      matchedSkills.set(canonical, current);
    }
  }

  const extracted: ExtractedSkillResult[] = Array.from(matchedSkills.values()).map((item) => {
    // Confidence is higher when repeated or exact
    const confidence = Math.min(0.98, 0.75 + Math.min(item.count, 5) * 0.04);
    return {
      skill: item.canonical,
      confidence: Math.round(confidence * 100) / 100,
      occurrences: item.count,
    };
  });

  // Calculate overall parsing confidence
  let confidenceScore = 50;
  if (extracted.length >= 5) confidenceScore = 90;
  else if (extracted.length >= 3) confidenceScore = 75;
  else if (extracted.length >= 1) confidenceScore = 60;

  // Infer suggested professional roles
  const skillNames = extracted.map((e) => e.skill);
  const suggestedRoles: string[] = [];
  if (skillNames.includes('React') || skillNames.includes('Tailwind CSS') || skillNames.includes('TypeScript')) {
    suggestedRoles.push('Frontend Web Developer');
  }
  if (skillNames.includes('Node.js') || skillNames.includes('PostgreSQL') || skillNames.includes('Express.js')) {
    suggestedRoles.push('Backend Engineer');
  }
  if (suggestedRoles.length === 2) {
    suggestedRoles.unshift('Full-Stack Software Engineer');
  }
  if (skillNames.includes('Docker') || skillNames.includes('Kubernetes') || skillNames.includes('AWS')) {
    suggestedRoles.push('Cloud & DevOps Specialist');
  }

  return {
    rawTextLength: text.length,
    extractedSkills: extracted,
    confidenceScore,
    suggestedRoles: suggestedRoles.slice(0, 3),
    missingCommonSkills: ['Git', 'Docker', 'Testing', 'CI/CD'].filter((s) => !skillNames.includes(s)),
  };
}
