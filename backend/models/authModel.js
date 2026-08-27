import { AuthMongoModel } from './authMongoModel.js';

export class AuthModel {
  // Find user by username
  static async findByUsername(username) {
    try {
      return await AuthMongoModel.findOne({ username }).lean();
    } catch (err) {
      console.error('Auth search error:', err.message);
      return null;
    }
  }

  // Update last_login timestamp
  static async updateLastLogin(id) {
    try {
      await AuthMongoModel.findByIdAndUpdate(id, { last_login: new Date() });
    } catch (err) {
      console.error('Auth update error:', err.message);
    }
  }
}

