import { Router } from 'express';
import {
  fileUploadMiddleware,
  uploadResume,
  getResumeStatus,
  downloadFile,
} from './fileController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = Router();

router.post('/resume', authenticateToken, requireRole(['FREELANCER']), fileUploadMiddleware, uploadResume);
router.get('/resume/status', authenticateToken, requireRole(['FREELANCER']), getResumeStatus);
router.get('/:fileKey', downloadFile);

export default router;
