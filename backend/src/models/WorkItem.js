// backend/src/models/WorkItem.js
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  type: { type: String, enum: ['Bug','Story','Task','Subtask'], required: true },
  status: { type: String, required: true }, // validate transitions in service
  title: { type: String, required: true },
  description: String,
  priority: { type: String, enum: ['Highest','High','Medium','Low','Lowest'], default: 'Medium' },
  storyPoints: Number,
  attachments: [{ name: String, url: String }],
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem' },
  epic: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem' },
  flags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('WorkItem', schema);
