// backend/src/models/WorkItem.js
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    space: { type: mongoose.Schema.Types.ObjectId, ref: "Space", required: true },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: "Sprint" },
    type: { type: String, enum: ["Bug", "Story", "Task", "Subtask"], required: true },
    status: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    priority: { type: String, enum: ["Highest", "High", "Medium", "Low", "Lowest"], default: "Medium" },
    storyPoints: Number,
    attachments: [{ name: String, url: String }],
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "WorkItem" },
    epic: { type: mongoose.Schema.Types.ObjectId, ref: "WorkItem" },
    flags: [String],

    // --- 🤖 ML FEATURES (Matches Python TicketData) ---
    // These store the snapshot of data used for the last prediction
    mlFeatures: {
      // 1. Complexity Metrics
      totalLinks: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      
      // 2. Sprint Context (Sprint2Vec)
      sprintLoad7d: { type: Number, default: 0 },      // Python: sprint_load_7d
      teamVelocity14d: { type: Number, default: 0 },   // Python: team_velocity_14d
      
      // 3. Developer Context
      authorWorkload14d: { type: Number, default: 0 }, // Python: author_workload_14d
      authorPastAvg: { type: Number, default: 0 },     // Python: author_past_avg
      velocityRoll5: { type: Number, default: 0 },     // Python: velocity_roll_5
      
      // 4. Change Metadata
      changeSequenceIndex: { type: Number, default: 0 },
      isWeekendChange: { type: Number, default: 0 },
    },

    // --- 📊 ML ANALYSIS RESULTS (Matches Python AnalysisResponse) ---
    mlAnalysis: {
      // Effort (Quantile Model)
      effortEstimate: Number,
      effortConfidence: Number, // 0-100 score
      
      // Productivity (Hybrid Model)
      productivityImpact: Number, // In Days
      
      // Schedule Risk (XGBoost)
      scheduleRiskProb: Number,
      scheduleRiskLabel: { type: String, enum: ["No Risk", "Low Risk", "Medium", "Medium Risk", "High Risk", "Critical Risk"] },
      
      // Quality Risk (TabNet)
      qualityRiskProb: Number,
      qualityRiskLabel: { type: String, enum: ["Low", "High"] },
      
      analyzedAt: Date
    }
  },
  { timestamps: true }
);

export default mongoose.model("WorkItem", schema);