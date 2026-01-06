import express from "express";
import { protect } from "../middleware/auth.js"; // Assuming you have auth middleware
import {
  analyzeBacklogItem,
  analyzeSprintLoad,
  analyzeMidSprintImpact,
  batchAnalyzeItems,
  applyRecommendation, // Import applyRecommendation controller
} from "../controllers/impact.controller.js";

const router = express.Router();

// 1. Analyze an item sitting in the Backlog (GET)
// Used when a user clicks "Analyze" on a ticket not yet in a sprint
router.get("/backlog/:workItemId/analyze", protect, analyzeBacklogItem);

// 2. Analyze an item inside an Active Sprint (GET)
// Used to check the current load impact of a specific active ticket
router.get("/sprints/:sprintId/items/:workItemId/analyze", protect, analyzeSprintLoad);

// 3. Analyze a New/Hypothetical Requirement (POST)
// Used when the user types into the "Requirement Change" form (Your specific snippet logic)
router.post("/sprints/:sprintId/analyze-impact", protect, analyzeMidSprintImpact);

// Used when the PM selects and applies a recommendation option
router.post("/sprints/:sprintId/apply-recommendation", protect, applyRecommendation);

// 5. Batch Analysis (POST)
// Used for bulk updates or re-analyzing the whole sprint
router.post("/sprints/batch-analyze", protect, batchAnalyzeItems);

export default router;
