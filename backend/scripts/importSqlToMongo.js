import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PlayerMongoModel } from '../models/playerMongoModel.js';

dotenv.config();

const sqlFilePath = 'c:\\Users\\Jatin\\OneDrive\\Desktop\\fsl\\GamePlayer Project Html\\sgfi db.sql';

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing');
      return;
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas...');

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Regex to match tuple values in INSERT INTO `player_record`
    const regex = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*'([^']+)'\)/g;

    let match;
    const records = [];
    const seenAadhaar = new Set();

    while ((match = regex.exec(sqlContent)) !== null) {
      const [
        _,
        id,
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
        time,
      ] = match;

      const cleanAadhaar = String(aadhaar_number).trim();

      if (!seenAadhaar.has(cleanAadhaar)) {
        seenAadhaar.add(cleanAadhaar);
        records.push({
          serial_no: serial_no.trim(),
          player_name: player_name.trim().toUpperCase(),
          aadhaar_number: cleanAadhaar,
          game: game.trim().toUpperCase(),
          age_group: age_group.trim().toUpperCase(),
          position: position.trim().toUpperCase(),
          state: state.trim().toUpperCase(),
          tournament_name: tournament_name.trim().toUpperCase(),
          organised_at: organised_at.trim().toUpperCase(),
          venue: venue.trim().toUpperCase(),
          player_photo: player_photo.trim(),
        });
      }
    }

    console.log(`Parsed ${records.length} unique player records from SQL dump file.`);

    if (records.length > 0) {
      // Upsert into MongoDB Atlas
      let insertedCount = 0;
      for (const rec of records) {
        await PlayerMongoModel.updateOne(
          { aadhaar_number: rec.aadhaar_number },
          { $set: rec },
          { upsert: true }
        );
        insertedCount++;
      }
      console.log(`🎉 Successfully migrated ${insertedCount} player records into MongoDB Atlas!`);
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
  }
};

migrate();
