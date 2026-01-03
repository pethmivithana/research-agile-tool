// backend/src/models/ChangeEvent.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  workItem: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem' },
  
  type: { type: String, enum: ['Addition', 'Update', 'Removal'], required: true },
  fieldsChanged: [{ type: String }], // E.g., ['storyPoints', 'priority']
  
  // Store previous and new values for auditing
  diffs: [{ 
    field: String, 
    old: mongoose.Schema.Types.Mixed, 
    new: mongoose.Schema.Types.Mixed 
  }],
  
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },

  // --- 🤖 IMPACT ANALYSIS SNAPSHOT ---
  // Stores what the AI predicted at the moment of this change
  mlImpact: {
    predictedEffort: Number,      // New Estimate
    productivityImpact: Number,   // Days delay
    scheduleRiskLabel: String,    // e.g., "Critical Risk"
    qualityRiskLabel: String,     // e.g., "High"
    qualityRiskProb: Number
  }
}, { timestamps: true });

export default mongoose.model('ChangeEvent', schema);