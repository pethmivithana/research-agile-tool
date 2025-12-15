// backend/src/models/Sprint.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  name: { type: String, required: true },
  goal: String,
  duration: { type: String, enum: ['1w','2w','3w','4w','custom'], required: true },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['planned','active','completed'], default: 'planned' },
  order: { type: Number, default: 1 },
  metrics: {
    committedSP: { type: Number, default: 0 },
    completedSP: { type: Number, default: 0 },
    spilloverSP: { type: Number, default: 0 },
    velocity: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model('Sprint', schema);
