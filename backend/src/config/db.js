// backend/src/config/db.js
import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('MongoDB connected');
}
