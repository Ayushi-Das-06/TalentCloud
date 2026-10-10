import { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { storageService } from '../../storage/storageAdapter.js';
import { queueService } from '../../queue/queueAdapter.js';

// Multer memory storage configuration with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed: Record<string, string[]> = {
      '.pdf': ['application/pdf'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.txt': ['text/plain'],
      '.md': ['text/markdown', 'text/plain'],
    };
    const extension = path.extname(file.originalname).toLowerCase();
    const nameIsSafe = file.originalname.length <= 255 && !/[\r\n\u0000-\u001f]/.test(file.originalname);
    if (nameIsSafe && allowed[extension]?.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Unsupported file name or format. Upload PDF, DOCX, TXT, or Markdown with a matching file type.') as Error & { statusCode: number; isOperational: boolean };
      error.statusCode = 400;
      error.isOperational = true;
      cb(error);
    }
  },
});

export const fileUploadMiddleware = upload.single('file');

export function hasValidFileSignature(file: Express.Multer.File): boolean {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === '.pdf') return file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'));
  if (extension === '.docx') return file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (extension === '.txt' || extension === '.md') {
    const text = file.buffer.toString('utf8');
    return !file.buffer.includes(0) && Buffer.from(text, 'utf8').equals(file.buffer) && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text);
  }
  return false;
}

export function validateFileContent(req: Request, res: Response, next: NextFunction) {
  if (!req.file) return next();
  if (!hasValidFileSignature(req.file)) {
    return res.status(400).json({ success: false, error: 'File contents do not match the supported file type' });
  }
  return next();
}

export async function uploadResume(req: Request, res: Response, next: NextFunction) {
  let unlinkedStorageKey: string | undefined;
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Only freelancers can upload resumes' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File is required' });
    }

    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Freelancer profile not found' });

    // 1. Save file to object storage
    const saved = await storageService.saveFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'resumes'
    );
    unlinkedStorageKey = saved.fileKey;

    // 2. Persist Resume record
    const resume = await prisma.resume.create({
      data: {
        freelancerProfileId: profile.id,
        fileName: saved.fileName,
        fileKey: saved.fileKey,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        status: 'QUEUED',
      },
    });
    unlinkedStorageKey = undefined;

    // 3. Queue asynchronous background processing job (Non-blocking cloud pattern!)
    try {
      await queueService.enqueue('RESUME_ANALYSIS', {
        resumeId: resume.id,
        fileKey: saved.fileKey,
        mimeType: saved.mimeType,
        freelancerProfileId: profile.id,
        userId: req.user.id,
      });
    } catch (error) {
      await prisma.resume.update({
        where: { id: resume.id },
        data: { status: 'FAILED', errorMessage: 'Resume analysis could not be queued. Please retry the upload.' },
      });
      throw error;
    }

    return res.status(202).json({
      success: true,
      message: 'Resume uploaded successfully. Analysis job has been queued for background processing.',
      data: resume,
    });
  } catch (err) {
    if (unlinkedStorageKey) await storageService.deleteFile(unlinkedStorageKey).catch(() => undefined);
    next(err);
  }
}

export async function uploadProjectFile(req: Request, res: Response, next: NextFunction) {
  let unlinkedStorageKey: string | undefined;
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!req.file) return res.status(400).json({ success: false, error: 'File is required' });

    const { projectId } = req.params;
    const { taskId, category = 'GENERAL' } = req.body;
    const allowedCategories = ['REQUIREMENT', 'DELIVERABLE', 'GENERAL'] as const;
    if (typeof category !== 'string' || !(allowedCategories as readonly string[]).includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid project file category' });
    }
    const fileCategory = category as (typeof allowedCategories)[number];
    if (taskId !== undefined && typeof taskId !== 'string') {
      return res.status(400).json({ success: false, error: 'Task ID must be a string' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: { select: { userId: true } }, contracts: { select: { freelancerProfileId: true } } },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const isClientOwner = project.client.userId === req.user.id;
    const isHiredFreelancer = !!req.user.freelancerProfileId && project.contracts.some(
      (contract) => contract.freelancerProfileId === req.user!.freelancerProfileId,
    );
    if (!isClientOwner && !isHiredFreelancer && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only project participants can upload files' });
    }

    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
      if (!task) return res.status(404).json({ success: false, error: 'Task not found for this project' });
    }

    const saved = await storageService.saveFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'projects');
    unlinkedStorageKey = saved.fileKey;
    const file = await prisma.projectFile.create({
      data: {
        projectId,
        taskId: taskId || null,
        uploaderId: req.user.id,
        fileName: saved.fileName,
        fileKey: saved.fileKey,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        category: fileCategory,
      },
    });
    unlinkedStorageKey = undefined;

    return res.status(201).json({ success: true, data: file });
  } catch (err) {
    if (unlinkedStorageKey) await storageService.deleteFile(unlinkedStorageKey).catch(() => undefined);
    next(err);
  }
}

export async function getResumeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== 'FREELANCER') {
      return res.status(403).json({ success: false, error: 'Freelancer access required' });
    }

    const profile = await prisma.freelancerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

    const resume = await prisma.resume.findFirst({
      where: { freelancerProfileId: profile.id },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!resume) {
      return res.status(404).json({ success: false, error: 'No resume found' });
    }

    return res.json({ success: true, data: resume });
  } catch (err) {
    next(err);
  }
}

export async function downloadFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

    const fileKey = req.params.fileKey;
    const resume = await prisma.resume.findFirst({
      where: { fileKey },
      include: { freelancerProfile: { select: { userId: true } } },
    });
    const projectFile = await prisma.projectFile.findFirst({
      where: { fileKey },
      include: {
        project: {
          include: {
            client: { select: { userId: true } },
            contracts: { include: { freelancer: { select: { userId: true } } } },
          },
        },
      },
    });
    const attachment = await prisma.projectAttachment.findFirst({
      where: { fileKey },
      include: {
        project: {
          include: {
            client: { select: { userId: true } },
            contracts: { include: { freelancer: { select: { userId: true } } } },
          },
        },
      },
    });

    const isProjectMember = (project: NonNullable<typeof projectFile>['project']) =>
      project.client.userId === req.user!.id ||
      project.contracts.some((contract) => contract.freelancer.userId === req.user!.id);
    const isOwner =
      req.user.role === 'ADMIN' ||
      resume?.freelancerProfile.userId === req.user.id ||
      (projectFile !== null && isProjectMember(projectFile.project)) ||
      (attachment !== null && isProjectMember(attachment.project));

    if (!resume && !projectFile && !attachment) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    if (!isOwner) return res.status(403).json({ success: false, error: 'You are not authorized to access this file' });

    const fileResult = await storageService.getFileStream(fileKey);

    if (!fileResult) {
      return res.status(404).json({ success: false, error: 'File not found on storage server' });
    }

    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader('Content-Length', fileResult.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fileKey).replace(/["\\\r\n]/g, '_')}"`);

    fileResult.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { projectId, fileId } = req.params;
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId },
      include: { project: { include: { client: { select: { userId: true } } } } },
    });
    if (!file) return res.status(404).json({ success: false, error: 'Project file not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const isProjectOwner = file.project.client.userId === req.user.id;
    const isUploader = file.uploaderId === req.user.id;
    if (!isAdmin && !isProjectOwner && !isUploader) {
      return res.status(403).json({ success: false, error: 'Only the uploader, project owner, or an administrator can delete this file' });
    }

    // Remove the storage object first so a storage failure does not leave a live database link to a missing file.
    await storageService.deleteFile(file.fileKey);
    await prisma.projectFile.delete({ where: { id: file.id } });
    return res.json({ success: true, message: 'Project file deleted' });
  } catch (err) {
    next(err);
  }
}
