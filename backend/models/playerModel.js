import { PlayerMongoModel } from './playerMongoModel.js';

export class PlayerModel {
  // Search player record by Aadhaar Number (MongoDB Atlas)
  static async findByAadhaar(aadhaarNumber) {
    const cleanAadhaar = String(aadhaarNumber).trim();

    try {
      const mongoRecords = await PlayerMongoModel.find({ aadhaar_number: cleanAadhaar }).lean();
      if (mongoRecords && mongoRecords.length > 0) {
        return mongoRecords;
      }
      return [];
    } catch (err) {
      console.error('MongoDB search error:', err.message);
      return [];
    }
  }

  // Get all player records
  static async findAll(limit = 100) {
    try {
      const mongoRecords = await PlayerMongoModel.find().sort({ _id: -1 }).limit(Number(limit)).lean();
      return mongoRecords || [];
    } catch (err) {
      console.error('MongoDB findAll error:', err.message);
      return [];
    }
  }

  // Get player record by ID
  static async findById(id) {
    try {
      const mongoRecord = await PlayerMongoModel.findById(id).lean();
      return mongoRecord || null;
    } catch (err) {
      console.error('MongoDB findById error:', err.message);
      return null;
    }
  }

  // Create a new player record in MongoDB Atlas
  static async create(playerData) {
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

    const formattedData = {
      serial_no,
      player_name: String(player_name).toUpperCase(),
      aadhaar_number: String(aadhaar_number),
      game: String(game).toUpperCase(),
      age_group: String(age_group).toUpperCase(),
      position: String(position).toUpperCase(),
      state: String(state).toUpperCase(),
      tournament_name: String(tournament_name).toUpperCase(),
      organised_at: String(organised_at).toUpperCase(),
      venue: String(venue).toUpperCase(),
      player_photo,
    };

    const createdMongoDoc = await PlayerMongoModel.create(formattedData);
    console.log('✅ Player saved to MongoDB Atlas:', createdMongoDoc.serial_no);
    return createdMongoDoc._id;
  }
}

