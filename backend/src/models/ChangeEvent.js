// backend/src/models/ChangeEvent.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  workItem: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem' },
  
  // Change tracking
  type: { type: String, enum: ['Addition', 'Update', 'Removal'], required: true },
  fieldsChanged: [{ type: String }],
  
  // Store previous and new values for auditing
  diffs: [{ 
    field: String, 
    old: mongoose.Schema.Types.Mixed, 
    new: mongoose.Schema.Types.Mixed 
  }],
  
  // Metadata
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  
  // Optional: Link to impact analysis if one was performed
  impactAnalysisRef: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem' }
}, { timestamps: true });

// Index for efficient querying
schema.index({ space: 1, date: -1 });
schema.index({ workItem: 1 });

export default mongoose.model('ChangeEvent', schema);