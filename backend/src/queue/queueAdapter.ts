import { config } from '../config/index.js';
import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma.js';

export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedReason?: string;
  result?: any;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<any>;

class QueueService {
  private handlers: Map<string, JobHandler> = new Map();
  private memoryJobs: Map<string, QueueJob> = new Map();
  private memoryQueue: string[] = [];
  private isProcessingMemory = false;
  private bullQueue?: Queue;
  private bullWorker?: Worker;

  constructor() {
    if (config.queue.driver === 'bullmq') {
      try {
        const connection = {
          host: config.queue.redis.host,
          port: config.queue.redis.port,
          password: config.queue.redis.password,
        };
        this.bullQueue = new Queue('marketplace-jobs', { connection });
        console.log('[Queue] BullMQ Redis queue initialized');
      } catch (err) {
        console.warn('[Queue] Failed to initialize BullMQ, falling back to memory queue:', err);
      }
    } else {
      console.log('[Queue] Initialized in-memory decoupled queue adapter');
    }
  }

  public registerHandler(jobType: string, handler: JobHandler) {
    this.handlers.set(jobType, handler);
  }

  public async enqueue<T = any>(jobType: string, data: T, maxRetries = 3): Promise<QueueJob<T>> {
    const jobId = uuidv4();
    const job: QueueJob<T> = {
      id: jobId,
      type: jobType,
      data,
      status: 'PENDING',
      retryCount: 0,
      maxRetries,
      createdAt: new Date(),
    };

    // Record in database if available
    try {
      await prisma.backgroundJob.create({
        data: {
          id: jobId,
          jobType,
          status: 'PENDING',
          payload: data as any,
          maxRetries,
        },
      });
    } catch (e) {
      // Prisma logging or fallback
    }

    if (this.bullQueue) {
      await this.bullQueue.add(jobType, data, {
        jobId,
        attempts: maxRetries,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } else {
      this.memoryJobs.set(jobId, job);
      this.memoryQueue.push(jobId);
      // Asynchronously process without blocking request thread
      setImmediate(() => this.processNextMemoryJob());
    }

    return job;
  }

  private async processNextMemoryJob() {
    if (this.isProcessingMemory || this.memoryQueue.length === 0) return;
    this.isProcessingMemory = true;

    const jobId = this.memoryQueue.shift();
    if (!jobId) {
      this.isProcessingMemory = false;
      return;
    }

    const job = this.memoryJobs.get(jobId);
    if (!job) {
      this.isProcessingMemory = false;
      return;
    }

    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.warn(`[Queue] No handler registered for job type: ${job.type}`);
      job.status = 'FAILED';
      job.failedReason = `No handler registered for ${job.type}`;
      this.updateDbJob(job);
      this.isProcessingMemory = false;
      this.processNextMemoryJob();
      return;
    }

    job.status = 'PROCESSING';
    job.processedAt = new Date();
    this.updateDbJob(job);

    try {
      const result = await handler(job);
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.result = result;
      this.updateDbJob(job);
    } catch (err: any) {
      console.error(`[Queue] Error processing job ${job.id}:`, err);
      job.retryCount += 1;
      if (job.retryCount < job.maxRetries) {
        job.status = 'PENDING';
        this.memoryQueue.push(job.id); // Re-queue
      } else {
        job.status = 'FAILED';
        job.failedReason = err.message || 'Unknown error';
      }
      this.updateDbJob(job);
    } finally {
      this.isProcessingMemory = false;
      // Continue next job in queue
      if (this.memoryQueue.length > 0) {
        setImmediate(() => this.processNextMemoryJob());
      }
    }
  }

  private async updateDbJob(job: QueueJob) {
    try {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: job.status,
          result: job.result ? (job.result as any) : undefined,
          error: job.failedReason,
          retryCount: job.retryCount,
          processedAt: job.processedAt,
        },
      });
    } catch (e) {
      // Ignore background update errors
    }
  }

  public async getStats() {
    if (this.bullQueue) {
      const [waiting, active, completed, failed] = await Promise.all([
        this.bullQueue.getWaitingCount(),
        this.bullQueue.getActiveCount(),
        this.bullQueue.getCompletedCount(),
        this.bullQueue.getFailedCount(),
      ]);
      return { waiting, active, completed, failed, driver: 'bullmq' };
    }

    const jobs = Array.from(this.memoryJobs.values());
    const waiting = jobs.filter((j) => j.status === 'PENDING').length;
    const active = jobs.filter((j) => j.status === 'PROCESSING').length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failed = jobs.filter((j) => j.status === 'FAILED').length;

    return {
      waiting,
      active,
      completed,
      failed,
      total: jobs.length,
      driver: 'memory',
      recentJobs: jobs.slice(-20).reverse(),
    };
  }

  public async retryJob(jobId: string): Promise<boolean> {
    const job = this.memoryJobs.get(jobId);
    if (job && job.status === 'FAILED') {
      job.status = 'PENDING';
      job.failedReason = undefined;
      job.retryCount = 0;
      this.memoryQueue.push(job.id);
      setImmediate(() => this.processNextMemoryJob());
      return true;
    }
    return false;
  }
}

export const queueService = new QueueService();
