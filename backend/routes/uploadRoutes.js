import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { uploadImage } from '../controllers/uploadController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/upload - Single image upload to Cloudinary (Protected with admin auth)
router.post('/', requireAdminAuth, upload.single('image'), uploadImage);

export default router;
