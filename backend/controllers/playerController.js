import { PlayerModel } from '../models/playerModel.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const PLAYER_PHOTO_FOLDER = 'sgfi player photos';

const isValidAadhaar = (value) => /^\d{12}$/.test(String(value || '').trim());

const normalizePlayerPayload = (payload) => ({
  serial_no: payload.serial_no,
  player_name: payload.player_name,
  aadhaar_number: payload.aadhaar_number,
  game: payload.game,
  age_group: payload.age_group || 'U-19',
  position: payload.position || 'REGISTERED PARTICIPANT',
  state: payload.state || 'RAJASTHAN',
  tournament_name: payload.tournament_name || 'NATIONAL SCHOOL GAMES 2026',
  organised_at: payload.organised_at || 'SGFI SPORTS COMPLEX',
  venue: payload.venue || 'MAIN STADIUM',
  player_photo: payload.player_photo || '',
});

const validatePlayerPayload = (payload) => {
  const { player_name, aadhaar_number, game, serial_no } = payload;

  if (!player_name || !aadhaar_number || !game || !serial_no) {
    return 'Serial No, Player Name, Aadhaar Number, and Game are required.';
  }

  if (!isValidAadhaar(aadhaar_number)) {
    return 'Aadhaar number must be exactly 12 digits.';
  }

  return '';
};

const slugifyName = (name) => {
  const slug = String(name || 'player')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'player';
};

const uploadPlayerPhoto = async (file, playerName) => {
  if (!file) return '';

  const publicId = `${slugifyName(playerName)}-${Date.now()}`;
  const uploadResult = await uploadToCloudinary(file.buffer, PLAYER_PHOTO_FOLDER, publicId);
  return uploadResult.secure_url;
};

export const searchPlayerByAadhaar = async (req, res) => {
  try {
    const { aadhaar } = req.params;
    if (!isValidAadhaar(aadhaar)) {
      return res.status(400).json({ success: false, message: 'Aadhaar number must be exactly 12 digits.' });
    }

    const records = await PlayerModel.findByAadhaar(aadhaar);
    if (!records || records.length === 0) {
      return res.status(404).json({ success: false, message: 'No player record found for this Aadhaar number.' });
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error('Error in searchPlayerByAadhaar:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
};

export const getAllPlayers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const search = req.query.search || '';

    const result = await PlayerModel.findPaginated(page, limit, search);

    return res.status(200).json({
      success: true,
      count: result.data.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in getAllPlayers:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
};

export const getPlayerById = async (req, res) => {
  try {
    const { id } = req.params;
    const player = await PlayerModel.findById(id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }
    return res.status(200).json({ success: true, data: player });
  } catch (error) {
    console.error('Error in getPlayerById:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
};

export const createPlayer = async (req, res) => {
  try {
    const playerData = normalizePlayerPayload(req.body);
    const validationError = validatePlayerPayload(playerData);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const photoUrl = await uploadPlayerPhoto(req.file, playerData.player_name);
    if (photoUrl) playerData.player_photo = photoUrl;

    const newId = await PlayerModel.create(playerData);
    const player = await PlayerModel.findById(newId);

    return res.status(201).json({
      success: true,
      message: 'Player record created successfully.',
      id: newId,
      data: player,
    });
  } catch (error) {
    console.error('Error in createPlayer:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
};

export const updatePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPlayer = await PlayerModel.findById(id);

    if (!existingPlayer) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    const playerData = normalizePlayerPayload({
      ...existingPlayer,
      ...req.body,
      player_photo: req.body.player_photo || existingPlayer.player_photo || '',
    });
    const validationError = validatePlayerPayload(playerData);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const photoUrl = await uploadPlayerPhoto(req.file, playerData.player_name);
    if (photoUrl) playerData.player_photo = photoUrl;

    const updatedPlayer = await PlayerModel.update(id, playerData);
    if (!updatedPlayer) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Player record updated successfully.',
      data: updatedPlayer,
    });
  } catch (error) {
    console.error('Error in updatePlayer:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
};

export const deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPlayer = await PlayerModel.softDelete(id, req.user?.id || null);

    if (!deletedPlayer) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Player record deleted successfully.',
      data: deletedPlayer,
    });
  } catch (error) {
    console.error('Error in deletePlayer:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
  }
};

export const registerPlayer = async (req, res) => {
  try {
    const {
      full_name,
      player_name,
      aadhaar,
      aadhaar_number,
      game,
      age_group = 'U-19',
      position = 'REGISTERED PARTICIPANT',
      state = 'RAJASTHAN',
      tournament_name = 'NATIONAL SCHOOL GAMES 2026',
      organised_at = 'SGFI SPORTS COMPLEX',
      venue = 'MAIN STADIUM',
    } = req.body;

    const name = full_name || player_name;
    const aadhaarNum = aadhaar || aadhaar_number;

    if (!name || !aadhaarNum || !game) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Aadhaar Number, and Game selection are required.',
      });
    }

    if (!isValidAadhaar(aadhaarNum)) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number must be exactly 12 digits.',
      });
    }

    // Handle Cloudinary photo upload if file was attached
    const photoUrl = await uploadPlayerPhoto(req.file, name);

    // Generate unique SGFI serial number
    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const serial_no = `SGFI/REG/${currentYear}/${randomCode}`;

    const playerData = {
      serial_no,
      player_name: name.toUpperCase(),
      aadhaar_number: aadhaarNum,
      game: game.toUpperCase(),
      age_group: age_group.toUpperCase(),
      position: position.toUpperCase(),
      state: state.toUpperCase(),
      tournament_name: tournament_name.toUpperCase(),
      organised_at: organised_at.toUpperCase(),
      venue: venue.toUpperCase(),
      player_photo: photoUrl,
    };

    const newId = await PlayerModel.create(playerData);

    return res.status(201).json({
      success: true,
      message: 'Registration completed successfully!',
      serial_no,
      photo_url: photoUrl,
      id: newId,
      player: playerData,
    });
  } catch (error) {
    console.error('Error in registerPlayer:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: error.message,
    });
  }
};

