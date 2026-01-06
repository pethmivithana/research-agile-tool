// backend/src/routes/analytics.routes.js
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { velocityForSpace, changesSummary, recommendStoryPoints } from "../controllers/analytics.controller.js"

const r = Router()

r.post("/analytics/recommend-sp", requireAuth, recommendStoryPoints)
r.get("/spaces/:spaceId/analytics/velocity", requireAuth, velocityForSpace)
r.get("/spaces/:spaceId/analytics/changes", requireAuth, changesSummary)

export default r
