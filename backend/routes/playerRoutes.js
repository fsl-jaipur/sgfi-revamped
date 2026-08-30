import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { requireAdminAuth } from '../middleware/auth.js';
import {
  searchPlayerByAadhaar,
  getAllPlayers,
  getPlayerById,
  createPlayer,
  registerPlayer,
  updatePlayer,
  deletePlayer,
} from '../controllers/playerController.js';

const router = Router();

// GET /api/players/search/:aadhaar
router.get('/search/:aadhaar', searchPlayerByAadhaar);

// POST /api/players/register (with Cloudinary photo upload)
router.post('/register', upload.single('photo'), registerPlayer);

// GET /api/players (admin)
router.get('/', requireAdminAuth, getAllPlayers);

// GET /api/players/:id (admin)
router.get('/:id', requireAdminAuth, getPlayerById);

// POST /api/players (admin with optional Cloudinary photo upload)
router.post('/', requireAdminAuth, upload.single('photo'), createPlayer);

// PUT /api/players/:id (admin with optional Cloudinary photo upload)
router.put('/:id', requireAdminAuth, upload.single('photo'), updatePlayer);

// DELETE /api/players/:id (admin soft delete)
router.delete('/:id', requireAdminAuth, deletePlayer);

export default router;
