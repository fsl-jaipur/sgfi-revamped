import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { uploadImage } from '../controllers/uploadController.js';

const router = Router();

// POST /api/upload - Single image upload to Cloudinary
router.post('/', upload.single('image'), uploadImage);

export default router;
