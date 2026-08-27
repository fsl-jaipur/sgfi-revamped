import { PlayerModel } from '../models/playerModel.js';

export const searchPlayerByAadhaar = async (req, res) => {
  try {
    const { aadhaar } = req.params;
    if (!aadhaar) {
      return res.status(400).json({ success: false, message: 'Aadhaar number is required.' });
    }

    const records = await PlayerModel.findByAadhaar(aadhaar);
    if (!records || records.length === 0) {
      return res.status(440).json({ success: false, message: 'No player record found for this Aadhaar number.' });
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
    const limit = req.query.limit || 100;
    const players = await PlayerModel.findAll(limit);
    return res.status(200).json({ success: true, count: players.length, data: players });
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
    const { player_name, aadhaar_number, game, serial_no } = req.body;
    if (!player_name || !aadhaar_number || !game || !serial_no) {
      return res.status(400).json({ success: false, message: 'Missing required player fields.' });
    }

    const newId = await PlayerModel.create(req.body);
    return res.status(201).json({ success: true, message: 'Player record created successfully.', id: newId });
  } catch (error) {
    console.error('Error in createPlayer:', error);
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

    // Handle Cloudinary photo upload if file was attached
    let photoUrl = '';
    if (req.file) {
      const { uploadToCloudinary } = await import('../config/cloudinary.js');
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'sgfi_player_photos');
      photoUrl = uploadResult.secure_url;
    }

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

