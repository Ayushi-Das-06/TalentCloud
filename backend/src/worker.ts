import { queueService, QueueJob } from './queue/queueAdapter.js';
import { storageService } from './storage/storageAdapter.js';
import { prisma } from './db/prisma.js';
import { parseResumeText, extractSkillsFromText } from './modules/intelligent/resumeParser.js';
import { normalizeSkill } from './modules/intelligent/matchingEngine.js';

export function initializeWorkerHandlers() {
  console.log('[Worker] Registering asynchronous background job handlers...');

  // 1. Resume Analysis Job Handler
  queueService.registerHandler('RESUME_ANALYSIS', async (job: QueueJob) => {
    const { resumeId, fileKey, mimeType, freelancerProfileId, userId } = job.data;
    console.log(`[Worker] Starting RESUME_ANALYSIS for resume ${resumeId} (Job: ${job.id})`);
    try {
    const existingResume = await prisma.resume.findUnique({ where: { id: resumeId }, select: { status: true } });
    if (!existingResume) throw new Error(`Resume ${resumeId} no longer exists`);
    if (existingResume.status === 'COMPLETED') return { alreadyProcessed: true };

    // Update resume state to PROCESSING
    await prisma.resume.update({
      where: { id: resumeId },
      data: { status: 'PROCESSING' },
    });

    const fileBuffer = await storageService.getFileBuffer(fileKey);
    if (!fileBuffer) {
      throw new Error(`File buffer not found for key: ${fileKey}`);
    }

    // Extract text
    const extractedText = await parseResumeText(fileBuffer, mimeType);

    // Extract skills and calculate confidence
    const analysisResult = extractSkillsFromText(extractedText);

    // Persist analysis in database
    await prisma.$transaction(async (tx) => {
      await tx.resume.update({
        where: { id: resumeId },
        data: {
          status: 'COMPLETED',
          rawText: extractedText.slice(0, 15000), // store preview
        },
      });

      await tx.resumeAnalysis.upsert({
        where: { resumeId },
        update: {
          extractedSkills: JSON.stringify(analysisResult.extractedSkills),
          missingCommonSkills: JSON.stringify(analysisResult.missingCommonSkills),
          suggestedRoles: JSON.stringify(analysisResult.suggestedRoles),
          confidenceScore: analysisResult.confidenceScore,
        },
        create: {
          resumeId,
          extractedSkills: JSON.stringify(analysisResult.extractedSkills),
          missingCommonSkills: JSON.stringify(analysisResult.missingCommonSkills),
          suggestedRoles: JSON.stringify(analysisResult.suggestedRoles),
          confidenceScore: analysisResult.confidenceScore,
        },
      });

      // Synchronize extracted skills into freelancer profile
      for (const item of analysisResult.extractedSkills) {
        const normalized = normalizeSkill(item.skill);
        let skill = await tx.skill.findUnique({ where: { normalizedName: normalized } });
        if (!skill) {
          skill = await tx.skill.create({
            data: { name: normalized, normalizedName: normalized, category: 'Technical' },
          });
        }

        await tx.freelancerSkill.upsert({
          where: {
            freelancerProfileId_skillId: {
              freelancerProfileId,
              skillId: skill.id,
            },
          },
          update: { yearsExperience: Math.min(5, Math.max(1, item.occurrences)) },
          create: {
            freelancerProfileId,
            skillId: skill.id,
            yearsExperience: Math.min(5, Math.max(1, item.occurrences)),
            isVerified: false,
          },
        });
      }

      // Notify the freelancer
      await tx.notification.create({
        data: {
          userId,
          title: 'Resume Analyzed Successfully',
          message: `Identified ${analysisResult.extractedSkills.length} skills from your uploaded resume with ${analysisResult.confidenceScore}% confidence.`,
          type: 'RESUME_PARSED',
          link: '/profile/edit',
        },
      });
    });

    console.log(`[Worker] RESUME_ANALYSIS completed successfully for resume ${resumeId}`);
    return {
      extractedSkillsCount: analysisResult.extractedSkills.length,
      confidenceScore: analysisResult.confidenceScore,
    };
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 1000) : 'Resume analysis failed';
      await prisma.resume.update({
        where: { id: resumeId },
        data: { status: 'FAILED', errorMessage: reason },
      }).catch(() => undefined);
      throw error;
    }
  });

  // 2. Burst Demonstration Workload Handler
  queueService.registerHandler('BURST_TEST_JOB', async (job: QueueJob) => {
    console.log(`[Worker] Processing burst job ${job.data.jobSequence} (Job ID: ${job.id})`);
    // Simulate non-trivial processing (e.g. 350ms CPU/network latency)
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      status: 'Processed in background worker',
      sequence: job.data.jobSequence,
      timestamp: new Date().toISOString(),
    };
  });

  queueService.startWorker();
}

// Standalone worker runner if invoked directly
if (process.argv[1]?.endsWith('worker.ts') || process.argv[1]?.endsWith('worker.js')) {
  console.log('[Worker] Starting standalone worker process...');
  initializeWorkerHandlers();
  const stop = async (signal: string) => {
    console.log(`[Worker] Received ${signal}; shutting down queue worker...`);
    await queueService.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once('SIGINT', () => void stop('SIGINT'));
  process.once('SIGTERM', () => void stop('SIGTERM'));
}
