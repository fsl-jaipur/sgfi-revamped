import db from '../config/db.js';

export class AuthModel {
  // Find user by username
  static async findByUsername(username) {
    const query = 'SELECT * FROM login WHERE username = ?';
    const [rows] = await db.execute(query, [username]);
    return rows[0] || null;
  }

  // Update last_login timestamp
  static async updateLastLogin(id) {
    const query = 'UPDATE login SET last_login = CURRENT_TIMESTAMP() WHERE id = ?';
    await db.execute(query, [id]);
  }
}
