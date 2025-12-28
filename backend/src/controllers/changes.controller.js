// backend/src/controllers/changes.controller.js
import ChangeEvent from "../models/ChangeEvent.js"
import axios from "axios"

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000"

export async function createChange(req, res, next) {
  try {
    const payload = req.body

    const spaceId = req.params.spaceId || payload.space

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" })
    }

    if (payload.sprint && payload.requirementDetails) {
      console.log("[CHANGE EVENT] Triggering ML analysis for requirement change")

      try {
        const mlAnalysis = await axios.post(`${PYTHON_SERVICE_URL}/analyze/mid-sprint-impact`, {
          title: payload.requirementDetails.title || payload.title,
          description: payload.requirementDetails.description || "",
          story_points: payload.requirementDetails.storyPoints || 5,
          priority: payload.requirementDetails.priority || "Medium",
          days_since_start: payload.daysIntoSprint || 0,
          sprint_capacity: 40,
          sprint_committed_sp: payload.currentLoad || 0,
        })

        payload.mlAnalysis = mlAnalysis.data
        console.log("[CHANGE EVENT] ML Analysis completed:", mlAnalysis.data.decision)
      } catch (mlError) {
        console.error("[CHANGE EVENT] ML Analysis failed:", mlError.message)
        // Continue creating change event even if ML fails
      }
    }

    const change = await ChangeEvent.create({
      ...payload,
      space: spaceId,
      author: req.user.id,
      date: new Date(),
    })

    res.status(201).json(change)
  } catch (e) {
    next(e)
  }
}

export async function getChange(req, res, next) {
  try {
    const change = await ChangeEvent.findById(req.params.id)
    if (!change) return res.status(404).json({ error: "Change not found" })
    res.json(change)
  } catch (e) {
    next(e)
  }
}
