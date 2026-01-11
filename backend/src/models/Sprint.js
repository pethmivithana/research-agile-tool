// backend/src/models/Sprint.js
import mongoose from "mongoose"

const schema = new mongoose.Schema(
  {
    space: { type: mongoose.Schema.Types.ObjectId, ref: "Space", required: true },
    name: { type: String, required: true },
    goal: String,
    duration: { type: String, enum: ["1w", "2w", "3w", "4w", "custom"], required: true },
    startDate: Date,
    endDate: Date,
    durationDays: { type: Number, default: 14 },
    teamCapacityHours: { type: Number, default: 120 },
    hoursPerDayPerDeveloper: { type: Number, default: 6 },
    numberOfDevelopers: { type: Number, default: 5 },
    status: { type: String, enum: ["planned", "active", "completed"], default: "planned" },
    order: { type: Number, default: 1 },
    metrics: {
      committedSP: { type: Number, default: 0 },
      completedSP: { type: Number, default: 0 },
      spilloverSP: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 },
      averageCompletionRate: { type: Number, default: 0.8 },
      prevSprintVelocity: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

// Add index to ensure only one active sprint per space
schema.index({ space: 1, status: 1 })

export default mongoose.model("Sprint", schema)