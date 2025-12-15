// backend/src/models/ChangeEvent.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  workItem: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem' },
  type: { type: String, enum: ['Addition','Update','Removal'], required: true },
  fieldsChanged: [{ type: String, enum: ['SP','priority','title','description','dependencies'] }],
  diffs: [{ field: String, old: mongoose.Schema.Types.Mixed, new: mongoose.Schema.Types.Mixed }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  mlImpact: {
    effortImpact: Number,
    scheduleRisk: Number,
    qualityRisk: Number,
    productivityChange: Number
  }
}, { timestamps: true });

export default mongoose.model('ChangeEvent', schema);
