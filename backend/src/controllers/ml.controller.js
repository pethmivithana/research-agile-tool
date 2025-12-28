// backend/src/controllers/ml.controller.js
import axios from 'axios';
import ChangeEvent from '../models/ChangeEvent.js';
// We assume you have a WorkItem model. Adjust the path if needed.
import WorkItem from '../models/WorkItem.js'; 

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function predictImpact(req, res, next) {
  try {
    const { change } = req.body;

    // 1. Fetch Full Context
    // The ML model needs the full Title & Description, not just the ID.
    const workItem = await WorkItem.findById(change.workItem);
    if (!workItem) {
        return res.status(404).json({ error: "Related WorkItem not found." });
    }

    // 2. Prepare Payload for Python
    // This matches the 'TicketData' Pydantic model in your Python main.py
    const aiPayload = {
      title: workItem.title || "",
      description: workItem.description || "",
      story_points: Number(workItem.storyPoints) || 0,
      priority: workItem.priority || "Major",
      // Calculate days roughly if you don't have exact sprint data
      days_since_start: workItem.sprintStartDate 
        ? Math.floor((new Date() - new Date(workItem.sprintStartDate)) / (1000 * 60 * 60 * 24)) 
        : 5, 
      change_history: [] // You could query ChangeEvent.find({ workItem: workItem._id }) to populate this
    };

    console.log("🤖 Sending to AI Service:", aiPayload);

    // 3. Call Python Models in Parallel
    // (Ensure your Python main.py has these 4 endpoints defined)
    const [effortRes, scheduleRes, qualityRes, prodRes] = await Promise.all([
       axios.post(`${PYTHON_SERVICE_URL}/predict/effort`, aiPayload),
       axios.post(`${PYTHON_SERVICE_URL}/predict/schedule`, aiPayload),
       axios.post(`${PYTHON_SERVICE_URL}/predict/quality`, aiPayload),
       axios.post(`${PYTHON_SERVICE_URL}/predict/productivity`, aiPayload)
    ]);

    // 4. Aggregate Results
    const impacts = {
      effortImpact: effortRes.data.value,         // e.g., 24.5 hours
      scheduleRisk: scheduleRes.data.probability, // e.g., 0.85
      qualityRisk: qualityRes.data.probability,   // e.g., 0.42
      productivityChange: prodRes.data.value      // e.g., -0.15
    };

    // 5. Save Results to DB
    // We update the ChangeEvent so the result is permanent
    await ChangeEvent.findByIdAndUpdate(change._id, { mlImpact: impacts });

    // 6. Return to Frontend
    res.json({ impacts, changeId: change._id });

  } catch (e) { 
    console.error("❌ AI Service Failed:", e.message);
    // Fallback: If AI is down, return nulls or defaults so the app doesn't crash
    next(e); 
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const { impacts } = req.body;
    const rulesApplied = [];
    const recs = [];

    // These rules now use REAL ML data!
    if ((impacts?.scheduleRisk || 0) > 0.5) {
      rulesApplied.push('High Schedule Risk');
      recs.push('⚠️ This change has a high chance of causing spillover.');
      recs.push('Suggestion: Break this story down into smaller sub-tasks.');
    }
    if ((impacts?.qualityRisk || 0) > 0.4) {
      rulesApplied.push('High Quality Risk');
      recs.push('🐛 High risk of bugs detected.');
      recs.push('Suggestion: Add a mandatory "Code Review" step and increase test coverage.');
    }
    if ((impacts?.productivityChange || 0) < -0.2) {
      rulesApplied.push('Productivity Drop');
      recs.push('📉 This change might slow down the team (complexity spike).');
      recs.push('Suggestion: Assign a senior developer to pair on this.');
    }
    
    if (recs.length === 0) {
        recs.push("✅ No major risks detected. Good to go!");
    }

    res.json({ recommendations: recs, rulesApplied });
  } catch (e) { next(e); }
}