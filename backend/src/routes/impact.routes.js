import express from "express";
import { protect } from "../middleware/auth.js";
import {
  analyzeBacklogItem,
  analyzeSprintLoad,
  analyzeMidSprintImpact,
  batchAnalyzeItems,
  applyRecommendation,
  healthCheck, // NEW: Health check endpoint
} from "../controllers/impact.controller.js";

const router = express.Router();

// Health check for ML service (no auth required for debugging)
router.get("/health", healthCheck);

// 1. Analyze an item sitting in the Backlog (GET)
// Used when a user clicks "Analyze" on a ticket not yet in a sprint
router.get("/backlog/:workItemId/analyze", protect, analyzeBacklogItem);

// 2. Analyze an item inside an Active Sprint (GET)
// Used to check the current load impact of a specific active ticket
router.get("/sprints/:sprintId/items/:workItemId/analyze", protect, analyzeSprintLoad);

// 3. Analyze a New/Hypothetical Requirement (POST)
// Used when the user types into the "Requirement Change" form
// THIS IS THE MAIN ENDPOINT FOR FRONTEND "IMPACT ANALYSIS" PAGE
router.post("/sprints/:sprintId/analyze-impact", protect, analyzeMidSprintImpact);

// 4. Apply selected recommendation (POST)
// Used when the PM selects and applies a recommendation option
router.post("/sprints/:sprintId/apply-recommendation", protect, applyRecommendation);

// 5. Batch Analysis (POST)
// Used for bulk updates or re-analyzing the whole sprint
router.post("/sprints/batch-analyze", protect, batchAnalyzeItems);

export default router;