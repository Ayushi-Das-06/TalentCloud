import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma.js';
import { queueService } from '../../queue/queueAdapter.js';
import os from 'os';

export async function getSystemStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [userCount, freelancerCount, clientCount, projectCount, contractCount] = await Promise.all([
      prisma.user.count(),
      prisma.freelancerProfile.count(),
      prisma.clientProfile.count(),
      prisma.project.count(),
      prisma.contract.count(),
    ]);

    const queueStats = await queueService.getStats();

    const systemInfo = {
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      osFreeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      cpus: os.cpus().length,
      nodeVersion: process.version,
    };

    return res.json({
      success: true,
      stats: {
        users: userCount,
        freelancers: freelancerCount,
        clients: clientCount,
        projects: projectCount,
        contracts: contractCount,
      },
      queue: queueStats,
      system: systemInfo,
    });
  } catch (err) {
    next(err);
  }
}

export async function getQueueDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await queueService.getStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

export async function triggerBurstTest(req: Request, res: Response, next: NextFunction) {
  try {
    const count = Math.min(50, Math.max(1, parseInt(req.body.count || '5', 10)));
    const enqueued = [];

    for (let i = 1; i <= count; i++) {
      const job = await queueService.enqueue('BURST_TEST_JOB', {
        jobSequence: i,
        batchId: Date.now(),
        simulatedTask: `Simulated parallel workload processing #${i}`,
      });
      enqueued.push(job.id);
    }

    return res.json({
      success: true,
      message: `Enqueued ${count} burst test jobs to demonstrate queue buffering and asynchronous worker consumption.`,
      jobIds: enqueued,
    });
  } catch (err) {
    next(err);
  }
}

export async function retryFailedJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;
    const success = await queueService.retryJob(jobId);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Job not found or not in failed state' });
    }

    return res.json({ success: true, message: `Job ${jobId} re-queued for processing.` });
  } catch (err) {
    next(err);
  }
}
