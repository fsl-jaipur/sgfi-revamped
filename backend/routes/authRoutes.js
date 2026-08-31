import { Router } from 'express';
import { loginUser, logoutUser, getCurrentUser } from '../controllers/authController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginUser);

// POST /api/auth/logout
router.post('/logout', logoutUser);

// GET /api/auth/me
router.get('/me', requireAdminAuth, getCurrentUser);

export default router;
