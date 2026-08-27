import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    serial_no: { type: String, required: true },
    player_name: { type: String, required: true },
    aadhaar_number: { type: String, required: true, index: true },
    game: { type: String, required: true },
    age_group: { type: String, default: 'U-19' },
    position: { type: String, default: 'PARTICIPANT' },
    state: { type: String, default: 'RAJASTHAN' },
    tournament_name: { type: String, default: 'NATIONAL SCHOOL GAMES' },
    organised_at: { type: String, default: 'SGFI SPORTS COMPLEX' },
    venue: { type: String, default: 'MAIN STADIUM' },
    player_photo: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PlayerMongoModel = mongoose.model('Player', playerSchema);
