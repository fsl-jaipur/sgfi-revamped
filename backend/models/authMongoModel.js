import mongoose from 'mongoose';

const authSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  last_login: { type: Date, default: Date.now },
});

export const AuthMongoModel = mongoose.model('User', authSchema, 'users');
