import { Router } from 'express';
import {
  fileUploadMiddleware,
  uploadResume,
  uploadProjectFile,
  getResumeStatus,
  downloadFile,
  deleteProjectFile,
  validateFileContent,
} from './fileController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { uploadRateLimit } from '../../middleware/rateLimit.js';
import { validateParams } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

router.post('/resume', authenticateToken, requireRole(['FREELANCER']), uploadRateLimit, fileUploadMiddleware, validateFileContent, uploadResume);
router.post('/projects/:projectId', authenticateToken, validateParams(z.object({ projectId: z.string().uuid() })), uploadRateLimit, fileUploadMiddleware, validateFileContent, uploadProjectFile);
router.delete('/projects/:projectId/:fileId', authenticateToken, validateParams(z.object({ projectId: z.string().uuid(), fileId: z.string().uuid() })), deleteProjectFile);
router.get('/resume/status', authenticateToken, requireRole(['FREELANCER']), getResumeStatus);
router.get('/:fileKey', authenticateToken, downloadFile);

export default router;
