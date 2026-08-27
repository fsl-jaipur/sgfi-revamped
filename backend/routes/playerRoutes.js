import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import {
  searchPlayerByAadhaar,
  getAllPlayers,
  getPlayerById,
  createPlayer,
  registerPlayer,
} from '../controllers/playerController.js';

const router = Router();

// GET /api/players/search/:aadhaar
router.get('/search/:aadhaar', searchPlayerByAadhaar);

// GET /api/players
router.get('/', getAllPlayers);

// GET /api/players/:id
router.get('/:id', getPlayerById);

// POST /api/players
router.post('/', createPlayer);

// POST /api/players/register (with Cloudinary photo upload)
router.post('/register', upload.single('photo'), registerPlayer);

export default router;
