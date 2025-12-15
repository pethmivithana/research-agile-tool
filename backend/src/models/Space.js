// backend/src/models/Space.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  settings: { sprintDurationDefault: { type: String, enum: ['1w','2w','3w','4w','custom'] } }
}, { timestamps: true });

export default mongoose.model('Space', schema);
