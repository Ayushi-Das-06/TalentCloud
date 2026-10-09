import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { storageService } from '../../storage/storageAdapter.js';
import { queueService } from '../../queue/queueAdapter.js';

// Multer memory storage configuration with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt') || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload PDF, TXT, DOCX, or images.'));
    }
  },
});

export const fileUploadMiddleware = upload.single('file');

export async function uploadResume(req: Request, res: Response, next: NextFunction) {
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

    // 3. Queue asynchronous background processing job (Non-blocking cloud pattern!)
    await queueService.enqueue('RESUME_ANALYSIS', {
      resumeId: resume.id,
      fileKey: saved.fileKey,
      mimeType: saved.mimeType,
      freelancerProfileId: profile.id,
      userId: req.user.id,
    });

    return res.status(202).json({
      success: true,
      message: 'Resume uploaded successfully. Analysis job has been queued for background processing.',
      data: resume,
    });
  } catch (err) {
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
    const fileKey = decodeURIComponent(req.params.fileKey);
    const fileResult = await storageService.getFileStream(fileKey);

    if (!fileResult) {
      return res.status(404).json({ success: false, error: 'File not found on storage server' });
    }

    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader('Content-Length', fileResult.size);
    res.setHeader('Content-Disposition', `inline; filename="${fileKey.split('/').pop()}"`);

    fileResult.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}
