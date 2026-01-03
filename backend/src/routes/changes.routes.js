// backend/src/routes/changes.routes.js
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { createChange, getChange, listChanges } from "../controllers/changes.controller.js"

const r = Router()

// Change event tracking routes
r.post("/spaces/:spaceId/changes", requireAuth, createChange)
r.get("/spaces/:spaceId/changes", requireAuth, listChanges)
r.get("/changes/:id", requireAuth, getChange)

export default r