// backend/src/routes/changes.routes.js
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { createChange, getChange } from "../controllers/changes.controller.js"

const r = Router()

r.post("/spaces/:spaceId/changes", requireAuth, createChange)
r.post("/changes", requireAuth, createChange)
r.get("/changes/:id", requireAuth, getChange)

export default r
