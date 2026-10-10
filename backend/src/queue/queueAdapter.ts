import { config } from '../config/index.js';
import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
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
  private sqsClient?: SQSClient;
  private sqsWorkerStarted = false;
  private sqsPollPromise?: Promise<void>;
  private closed = false;

  constructor() {
    if (config.queue.driver === 'sqs') {
      if (!config.queue.sqs.queueUrl) throw new Error('SQS_QUEUE_URL is required when QUEUE_DRIVER=sqs.');
      this.sqsClient = new SQSClient({
        region: config.queue.sqs.region,
        endpoint: config.queue.sqs.endpoint,
      });
      console.log(`[Queue] Initialized Amazon SQS adapter in ${config.queue.sqs.region}`);
      return;
    }

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

  public startWorker() {
    if (this.closed) throw new Error('Queue service is closed and cannot start a worker.');
    if (this.sqsClient) {
      this.startSqsWorker();
      return;
    }
    if (!this.bullQueue || this.bullWorker) return;
    const connection = {
      host: config.queue.redis.host,
      port: config.queue.redis.port,
      password: config.queue.redis.password,
    };

    this.bullWorker = new Worker(
      'marketplace-jobs',
      async (bullJob: Job) => {
        const handler = this.handlers.get(bullJob.name);
        if (!handler) throw new Error(`No handler registered for ${bullJob.name}`);
        const job: QueueJob = {
          id: String(bullJob.id),
          type: bullJob.name,
          data: bullJob.data,
          status: 'PROCESSING',
          retryCount: bullJob.attemptsMade,
          maxRetries: bullJob.opts.attempts || 1,
          createdAt: new Date(bullJob.timestamp),
          processedAt: new Date(),
        };
        await this.updateDbJob(job);
        try {
          job.result = await handler(job);
          job.status = 'COMPLETED';
          job.completedAt = new Date();
          await this.updateDbJob(job);
          return job.result;
        } catch (error) {
          job.retryCount = bullJob.attemptsMade + 1;
          job.status = job.retryCount >= job.maxRetries ? 'FAILED' : 'PENDING';
          job.failedReason = error instanceof Error ? error.message : 'Unknown error';
          await this.updateDbJob(job);
          throw error;
        }
      },
      { connection },
    );

    this.bullWorker.on('error', (error) => console.error('[Queue] BullMQ worker error:', error));
    console.log('[Queue] BullMQ worker started');
  }

  public async close(): Promise<void> {
    this.closed = true;
    this.sqsWorkerStarted = false;
    const memoryDrain = async () => {
      const deadline = Date.now() + 30_000;
      while ((this.isProcessingMemory || this.memoryQueue.length > 0) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    };
    await Promise.allSettled([
      this.bullWorker?.close(),
      this.bullQueue?.close(),
      memoryDrain(),
    ]);
    await this.sqsPollPromise;
    this.sqsClient?.destroy();
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

    // Persist a portable job record for admin metrics, retries, and failure inspection.
    await prisma.backgroundJob.create({
      data: {
        id: jobId,
        jobType,
        status: 'PENDING',
        payload: JSON.stringify(data),
        maxRetries,
      },
    });

    if (this.sqsClient) {
      try {
        await this.sqsClient.send(new SendMessageCommand({
          QueueUrl: config.queue.sqs.queueUrl,
          MessageBody: JSON.stringify({ id: jobId, type: jobType, data, maxRetries }),
        }));
      } catch (error) {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Queue submission failed' },
        });
        throw error;
      }
      return job;
    }

    if (this.bullQueue) {
      try {
        await this.bullQueue.add(jobType, data, {
          jobId,
          attempts: maxRetries,
          backoff: { type: 'exponential', delay: 1000 },
        });
      } catch (error) {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Queue submission failed' },
        });
        throw error;
      }
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
          result: job.result !== undefined ? JSON.stringify(job.result) : undefined,
          error: job.failedReason ?? null,
          retryCount: job.retryCount,
          processedAt: job.processedAt,
        },
      });
    } catch (e) {
      // Ignore background update errors
    }
  }

  public async getStats() {
    if (this.sqsClient) {
      const attributes = await this.sqsClient.send(new GetQueueAttributesCommand({
        QueueUrl: config.queue.sqs.queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      }));
      const [completed, failed] = await Promise.all([
        prisma.backgroundJob.count({ where: { status: 'COMPLETED' } }),
        prisma.backgroundJob.count({ where: { status: 'FAILED' } }),
      ]);
      return {
        waiting: Number(attributes.Attributes?.ApproximateNumberOfMessages || 0),
        active: Number(attributes.Attributes?.ApproximateNumberOfMessagesNotVisible || 0),
        completed,
        failed,
        driver: 'sqs',
      };
    }

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
    if (this.sqsClient) {
      const record = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
      if (!record || record.status !== 'FAILED') return false;
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: { status: 'PENDING', retryCount: 0, error: null, result: null, processedAt: null },
      });
      try {
        await this.sqsClient.send(new SendMessageCommand({
          QueueUrl: config.queue.sqs.queueUrl,
          MessageBody: JSON.stringify({
            id: record.id,
            type: record.jobType,
            data: JSON.parse(record.payload),
            maxRetries: record.maxRetries,
          }),
        }));
      } catch (error) {
        await prisma.backgroundJob.update({ where: { id: jobId }, data: { status: 'FAILED' } });
        throw error;
      }
      return true;
    }

    if (this.bullQueue) {
      const bullJob = await this.bullQueue.getJob(jobId);
      if (!bullJob || (await bullJob.getState()) !== 'failed') return false;
      await bullJob.retry('failed');
      await prisma.backgroundJob.updateMany({
        where: { id: jobId },
        data: { status: 'PENDING', retryCount: 0, error: null, processedAt: null },
      });
      return true;
    }

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

  private startSqsWorker() {
    if (this.sqsWorkerStarted) return;
    this.sqsWorkerStarted = true;
    this.sqsPollPromise = this.pollSqs();
  }

  private async pollSqs(): Promise<void> {
    while (this.sqsWorkerStarted) {
      try {
        const response = await this.sqsClient!.send(new ReceiveMessageCommand({
          QueueUrl: config.queue.sqs.queueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 120,
          MessageSystemAttributeNames: ['ApproximateReceiveCount'],
        }));

        for (const message of response.Messages || []) {
          if (!message.Body || !message.ReceiptHandle) continue;
          await this.processSqsMessage(message.Body, message.ReceiptHandle, Number(message.Attributes?.ApproximateReceiveCount || 1));
        }
      } catch (error) {
        console.error('[Queue] SQS receive loop error:', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processSqsMessage(body: string, receiptHandle: string, receiveCount: number) {
    let envelope: { id: string; type: string; data: unknown; maxRetries?: number };
    try {
      envelope = JSON.parse(body);
      if (!envelope.id || !envelope.type) throw new Error('Required job fields are missing');
    } catch (error) {
      console.error('[Queue] Deleting malformed SQS job message:', error);
      await this.sqsClient!.send(new DeleteMessageCommand({ QueueUrl: config.queue.sqs.queueUrl, ReceiptHandle: receiptHandle }));
      return;
    }

    const maxRetries = Math.max(1, envelope.maxRetries || 3);
    const job: QueueJob = {
      id: envelope.id,
      type: envelope.type,
      data: envelope.data,
      status: 'PROCESSING',
      retryCount: receiveCount - 1,
      maxRetries,
      createdAt: new Date(),
      processedAt: new Date(),
    };

    try {
      const handler = this.handlers.get(job.type);
      if (!handler) throw new Error(`No handler registered for ${job.type}`);
      await this.updateDbJob(job);
      job.result = await handler(job);
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      await this.updateDbJob(job);
    } catch (error) {
      job.retryCount = receiveCount;
      job.failedReason = error instanceof Error ? error.message : 'Unknown error';
      job.status = receiveCount >= maxRetries ? 'FAILED' : 'PENDING';
      await this.updateDbJob(job);
      if (job.status === 'PENDING') {
        await this.sqsClient!.send(new ChangeMessageVisibilityCommand({
          QueueUrl: config.queue.sqs.queueUrl,
          ReceiptHandle: receiptHandle,
          VisibilityTimeout: Math.min(900, 2 ** receiveCount),
        }));
        return;
      }
    }

    await this.sqsClient!.send(new DeleteMessageCommand({ QueueUrl: config.queue.sqs.queueUrl, ReceiptHandle: receiptHandle }));
  }
}

export const queueService = new QueueService();
