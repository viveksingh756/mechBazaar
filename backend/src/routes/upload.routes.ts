import { Router } from 'express';
import { uploadFileBase64 } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/base64', authenticate as any, uploadFileBase64 as any);

export default router;
