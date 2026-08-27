import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PlayerMongoModel } from '../models/playerMongoModel.js';

dotenv.config();

const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn('⚠️ MONGO_URI is missing in .env');
      return;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

    const count = await PlayerMongoModel.countDocuments();
    console.log(`📊 MongoDB Atlas contains ${count} player records.`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

export default connectMongoDB;
