import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import {
  createSprint,
  editSprint,
  startSprint,
  completeSprintCtrl,
  listSprints,
} from "../controllers/sprints.controller.js"

const r = Router()

r.get("/spaces/:spaceId/sprints", requireAuth, listSprints)
r.post("/spaces/:spaceId/sprints", requireAuth, createSprint)
r.patch("/sprints/:sprintId", requireAuth, editSprint)
r.post("/sprints/:sprintId/start", requireAuth, startSprint)
r.post("/sprints/:sprintId/complete", requireAuth, completeSprintCtrl)
r.delete("/sprints/:sprintId", requireAuth, async (req, res, next) => {
  try {
    const { sprintId } = req.params
    const Sprint = (await import("../models/Sprint.js")).default
    await Sprint.findByIdAndDelete(sprintId)
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

export default r
