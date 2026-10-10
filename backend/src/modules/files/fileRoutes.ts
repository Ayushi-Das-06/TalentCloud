import { Router } from 'express';
import {
  fileUploadMiddleware,
  uploadResume,
  uploadProjectFile,
  getResumeStatus,
  downloadFile,
} from './fileController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

router.post('/resume', authenticateToken, requireRole(['FREELANCER']), fileUploadMiddleware, uploadResume);
router.post('/projects/:projectId', authenticateToken, fileUploadMiddleware, uploadProjectFile);
router.get('/resume/status', authenticateToken, requireRole(['FREELANCER']), getResumeStatus);
router.get('/:fileKey', authenticateToken, downloadFile);

export default router;
