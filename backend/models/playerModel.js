import db from '../config/db.js';

export class PlayerModel {
  // Search player record by Aadhaar Number
  static async findByAadhaar(aadhaarNumber) {
    const query = 'SELECT * FROM player_record WHERE aadhaar_number = ?';
    const [rows] = await db.execute(query, [aadhaarNumber]);
    return rows;
  }

  // Get all player records (paginated/limited)
  static async findAll(limit = 100) {
    const query = 'SELECT * FROM player_record ORDER BY id DESC LIMIT ?';
    const [rows] = await db.query(query, [Number(limit)]);
    return rows;
  }

  // Get player record by ID
  static async findById(id) {
    const query = 'SELECT * FROM player_record WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
  }

  // Create a new player record
  static async create(playerData) {
    const {
      serial_no,
      player_name,
      aadhaar_number,
      game,
      age_group,
      position,
      state,
      tournament_name,
      organised_at,
      venue,
      player_photo = '',
    } = playerData;

    const query = `
      INSERT INTO player_record 
      (serial_no, player_name, aadhaar_number, game, age_group, position, state, tournament_name, organised_at, venue, player_photo, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await db.execute(query, [
      serial_no,
      player_name,
      aadhaar_number,
      game,
      age_group,
      position,
      state,
      tournament_name,
      organised_at,
      venue,
      player_photo,
    ]);

    return result.insertId;
  }
}
