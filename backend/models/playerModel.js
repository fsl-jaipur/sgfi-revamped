import { PlayerMongoModel } from './playerMongoModel.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class PlayerModel {
  static formatPlayerData(playerData) {
    const {
      serial_no,
      player_name,
      aadhaar_number,
      game,
      age_group = 'U-19',
      position = 'REGISTERED PARTICIPANT',
      state = 'RAJASTHAN',
      tournament_name = 'NATIONAL SCHOOL GAMES 2026',
      organised_at = 'SGFI SPORTS COMPLEX',
      venue = 'MAIN STADIUM',
      player_photo = '',
    } = playerData;

    return {
      serial_no: String(serial_no).trim(),
      player_name: String(player_name).trim().toUpperCase(),
      aadhaar_number: String(aadhaar_number).trim(),
      game: String(game).trim().toUpperCase(),
      age_group: String(age_group).trim().toUpperCase(),
      position: String(position).trim().toUpperCase(),
      state: String(state).trim().toUpperCase(),
      tournament_name: String(tournament_name).trim().toUpperCase(),
      organised_at: String(organised_at).trim().toUpperCase(),
      venue: String(venue).trim().toUpperCase(),
      player_photo: String(player_photo || '').trim(),
    };
  }

  // Search active player records by Aadhaar Number.
  static async findByAadhaar(aadhaarNumber) {
    const cleanAadhaar = String(aadhaarNumber).trim();

    try {
      const mongoRecords = await PlayerMongoModel.find({
        aadhaar_number: cleanAadhaar,
        is_deleted: { $ne: true },
      }).lean();

      return mongoRecords || [];
    } catch (err) {
      console.error('MongoDB search error:', err.message);
      return [];
    }
  }

  // Get active player records.
  static async findAll(limit = 100, search = '') {
    try {
      const filter = { is_deleted: { $ne: true } };
      const cleanSearch = String(search || '').trim();

      if (cleanSearch) {
        const regex = new RegExp(escapeRegex(cleanSearch), 'i');
        filter.$or = [
          { player_name: regex },
          { aadhaar_number: regex },
          { serial_no: regex },
          { game: regex },
          { state: regex },
        ];
      }

      const mongoRecords = await PlayerMongoModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .limit(Number(limit))
        .lean();

      return mongoRecords || [];
    } catch (err) {
      console.error('MongoDB findAll error:', err.message);
      return [];
    }
  }

  // Get active player records with server-side pagination (max 50 per request).
  static async findPaginated(page = 1, limit = 50, search = '') {
    try {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const filter = { is_deleted: { $ne: true } };
      const cleanSearch = String(search || '').trim();

      if (cleanSearch) {
        const regex = new RegExp(escapeRegex(cleanSearch), 'i');
        filter.$or = [
          { player_name: regex },
          { aadhaar_number: regex },
          { serial_no: regex },
          { game: regex },
          { state: regex },
        ];
      }

      const total = await PlayerMongoModel.countDocuments(filter);
      const totalPages = Math.ceil(total / limitNum) || 1;

      const mongoRecords = await PlayerMongoModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      return {
        data: mongoRecords || [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      };
    } catch (err) {
      console.error('MongoDB findPaginated error:', err.message);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
    }
  }

  // Get active player record by ID.
  static async findById(id) {
    try {
      const mongoRecord = await PlayerMongoModel.findOne({
        _id: id,
        is_deleted: { $ne: true },
      }).lean();

      return mongoRecord || null;
    } catch (err) {
      console.error('MongoDB findById error:', err.message);
      return null;
    }
  }

  // Create a new player record in MongoDB Atlas.
  static async create(playerData) {
    const formattedData = PlayerModel.formatPlayerData(playerData);
    const createdMongoDoc = await PlayerMongoModel.create(formattedData);

    console.log('Player saved to MongoDB Atlas:', createdMongoDoc.serial_no);
    return createdMongoDoc._id;
  }

  static async update(id, playerData) {
    const formattedData = PlayerModel.formatPlayerData(playerData);
    const updatedMongoDoc = await PlayerMongoModel.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      { $set: formattedData },
      { new: true, runValidators: true }
    ).lean();

    return updatedMongoDoc || null;
  }

  static async softDelete(id, deletedBy = null) {
    const deletedMongoDoc = await PlayerMongoModel.findOneAndUpdate(
      { _id: id, is_deleted: { $ne: true } },
      {
        $set: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
      },
      { new: true }
    ).lean();

    return deletedMongoDoc || null;
  }
}
