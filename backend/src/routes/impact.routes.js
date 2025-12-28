import express from "express"
import { protect } from "../middleware/auth.js"
import {
  analyzeBacklogItem,
  analyzeSprintLoad,
  analyzeMidSprintImpact,
  batchAnalyzeItems,
} from "../controllers/impact.controller.js"

const router = express.Router()

router.get("/backlog/:workItemId/analyze", protect, analyzeBacklogItem)
router.get("/sprints/:sprintId/items/:workItemId/analyze", protect, analyzeSprintLoad)
router.post("/sprints/:sprintId/analyze-impact", protect, analyzeMidSprintImpact)
router.post("/sprints/batch-analyze", protect, batchAnalyzeItems)

export default router
