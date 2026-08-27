import db from '../config/db.js';
import { PlayerMongoModel } from './playerMongoModel.js';
import { initialSamplePlayers } from '../config/dbMongo.js';

export class PlayerModel {
  // Search player record by Aadhaar Number (MongoDB -> MySQL -> Fallback Dataset)
  static async findByAadhaar(aadhaarNumber) {
    const cleanAadhaar = String(aadhaarNumber).trim();

    // 1. Try MongoDB Atlas first
    try {
      const mongoRecords = await PlayerMongoModel.find({ aadhaar_number: cleanAadhaar }).lean();
      if (mongoRecords && mongoRecords.length > 0) {
        return mongoRecords;
      }
    } catch (err) {
      console.warn('MongoDB search error, trying MySQL fallback:', err.message);
    }

    // 2. Try MySQL next
    try {
      const query = 'SELECT * FROM player_record WHERE aadhaar_number = ?';
      const [rows] = await db.execute(query, [cleanAadhaar]);
      if (rows && rows.length > 0) {
        return rows;
      }
    } catch (err) {
      console.warn('MySQL search error/not connected:', err.message);
    }

    // 3. Fallback to initial sample dataset from sgfi db.sql
    const fallbackMatch = initialSamplePlayers.filter(
      p => String(p.aadhaar_number).trim() === cleanAadhaar
    );

    return fallbackMatch;
  }

  // Get all player records
  static async findAll(limit = 100) {
    try {
      const mongoRecords = await PlayerMongoModel.find().sort({ _id: -1 }).limit(Number(limit)).lean();
      if (mongoRecords && mongoRecords.length > 0) {
        return mongoRecords;
      }
    } catch (err) {
      console.warn('MongoDB findAll error:', err.message);
    }

    try {
      const query = 'SELECT * FROM player_record ORDER BY id DESC LIMIT ?';
      const [rows] = await db.query(query, [Number(limit)]);
      return rows;
    } catch (err) {
      return initialSamplePlayers;
    }
  }

  // Get player record by ID
  static async findById(id) {
    try {
      const mongoRecord = await PlayerMongoModel.findById(id).lean();
      if (mongoRecord) return mongoRecord;
    } catch (err) {
      // Ignore
    }

    try {
      const query = 'SELECT * FROM player_record WHERE id = ?';
      const [rows] = await db.execute(query, [id]);
      return rows[0] || null;
    } catch (err) {
      return null;
    }
  }

  // Create a new player record (saves to MongoDB Atlas & MySQL)
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

    let createdMongoDoc = null;

    // 1. Save to MongoDB Atlas
    try {
      createdMongoDoc = await PlayerMongoModel.create(formattedData);
      console.log('✅ Player saved to MongoDB Atlas:', createdMongoDoc.serial_no);
    } catch (err) {
      console.error('Error saving to MongoDB:', err.message);
    }

    // 2. Save to MySQL
    try {
      const query = `
        INSERT INTO player_record 
        (serial_no, player_name, aadhaar_number, game, age_group, position, state, tournament_name, organised_at, venue, player_photo, time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      const [result] = await db.execute(query, [
        formattedData.serial_no,
        formattedData.player_name,
        formattedData.aadhaar_number,
        formattedData.game,
        formattedData.age_group,
        formattedData.position,
        formattedData.state,
        formattedData.tournament_name,
        formattedData.organised_at,
        formattedData.venue,
        formattedData.player_photo,
      ]);
      return result.insertId;
    } catch (err) {
      console.warn('MySQL save skipped/error:', err.message);
    }

    return createdMongoDoc ? createdMongoDoc._id : Date.now();
  }
}
