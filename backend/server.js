import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectMongoDB from './config/dbMongo.js';
import playerRoutes from './routes/playerRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect MongoDB Atlas
connectMongoDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/players', playerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Root Healthcheck Route
app.get('/', (req, res) => {
  res.json({
    message: 'SGFI Backend API (ES6 Express + MongoDB + Cloudinary) is running smoothly',
    status: 'online',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
