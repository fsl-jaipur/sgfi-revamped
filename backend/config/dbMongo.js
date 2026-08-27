import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PlayerMongoModel } from '../models/playerMongoModel.js';

dotenv.config();

export const initialSamplePlayers = [
  {
    serial_no: 'SGFI/N04/21/164',
    player_name: 'ANURAJ PANCHAL',
    aadhaar_number: '490020182409',
    game: 'KABADDI',
    age_group: 'U-19',
    position: '1ST GOLD',
    state: 'UTTARPRADESH',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/165',
    player_name: 'ARJUN SOAM',
    aadhaar_number: '299584328212',
    game: 'KABADDI',
    age_group: 'U-19',
    position: '1ST GOLD',
    state: 'UTTARPRADESH',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/166',
    player_name: 'LAKSHMAN SOAM',
    aadhaar_number: '667309081299',
    game: 'KABADDI',
    age_group: 'U-19',
    position: '1ST GOLD',
    state: 'UTTARPRADESH',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/346',
    player_name: 'SUKHCHAIN SINGH',
    aadhaar_number: '668581263287',
    game: 'HANDBALL',
    age_group: 'SENIOR',
    position: '1ST GOLD',
    state: 'PUNJAB',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/07',
    player_name: 'AZHAR KHAN',
    aadhaar_number: '664812390588',
    game: 'KABADDI',
    age_group: 'SENIOR',
    position: '3RD BRONZE',
    state: 'BIHAR',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/02',
    player_name: 'DHARMPAL',
    aadhaar_number: '927609446713',
    game: 'ATH. 400 MTR.',
    age_group: 'U-22',
    position: '2ND SILVER',
    state: 'UTTARPRADESH',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/574',
    player_name: 'PAVAN SAINI',
    aadhaar_number: '889256201669',
    game: 'ATH. 400 MTR.',
    age_group: 'U-22',
    position: '2ND SILVER',
    state: 'UTTARPRADESH',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/657',
    player_name: 'ASHUTOSH KUMAR SHARMA',
    aadhaar_number: '903988616138',
    game: 'FOOTBALL',
    age_group: 'U-22',
    position: '1ST GOLD',
    state: 'BIHAR',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/656',
    player_name: 'MOHAMMED ASHARAF KV',
    aadhaar_number: '645808809218',
    game: 'ATH.100 MTR.',
    age_group: 'U-22',
    position: '1ST GOLD',
    state: 'KERALA',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N04/21/655',
    player_name: 'KAMLESH DHAKA',
    aadhaar_number: '316491868439',
    game: 'ATH. 400 MTR.',
    age_group: 'SENIOR',
    position: '1ST GOLD',
    state: 'RAJASTHAN',
    tournament_name: '4TH NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'DEHRADUN',
    player_photo: ''
  },
  {
    serial_no: 'SGFI/N03/19/929',
    player_name: 'NITESH KUMAR',
    aadhaar_number: '249062418350',
    game: 'VOLLEYBALL',
    age_group: 'SENIOR',
    position: '1ST GOLD',
    state: 'RAJASTHAN',
    tournament_name: '3RD NATIONAL',
    organised_at: 'MAHARANA PRATAP SPORTS COLLEGE',
    venue: 'SUJANPUR(H.P.)',
    player_photo: ''
  }
];

const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn('⚠️ MONGO_URI is missing in .env');
      return;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

    // Auto-seed MongoDB Atlas with sample players if empty
    const count = await PlayerMongoModel.countDocuments();
    if (count === 0) {
      await PlayerMongoModel.insertMany(initialSamplePlayers);
      console.log(`✨ Seeded ${initialSamplePlayers.length} sample SGFI players into MongoDB Atlas!`);
    } else {
      console.log(`📊 MongoDB Atlas contains ${count} player records.`);
    }
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
  }
};

export default connectMongoDB;
