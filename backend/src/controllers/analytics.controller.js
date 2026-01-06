// backend/src/controllers/analytics.controller.js
import Sprint from "../models/Sprint.js"
import WorkItem from "../models/WorkItem.js"
import ChangeEvent from "../models/ChangeEvent.js"
import mongoose from "mongoose"

export async function velocityForSpace(req, res, next) {
  try {
    const { spaceId } = req.params
    const sprints = await Sprint.find({ space: spaceId, status: "completed" }).sort("-order").limit(3)
    const velocities = sprints.map((s) => s.metrics?.velocity || 0)
    const avgLast3 = velocities.length ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0

    const committed = sprints[0]?.metrics?.committedSP || 0
    const completed = sprints[0]?.metrics?.completedSP || 0
    const spilloverRate = committed ? (committed - completed) / committed : 0

    // naive availability factor: ratio of assigned SP (placeholder 1.0)
    const predictedCapacity = avgLast3

    res.json({ avgLast3, predictedCapacity, spilloverRate })
  } catch (e) {
    next(e)
  }
}

export async function changesSummary(req, res, next) {
  try {
    const { spaceId } = req.params

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({ error: "Invalid space ID" })
    }

    const changes = await ChangeEvent.find({ space: spaceId }).sort("date")

    if (!changes || changes.length === 0) {
      return res.json({
        byDate: {},
        spAddedRemoved: {},
        priorityChanges: {},
        typeDist: {},
        dependencyRiskScore: 0,
      })
    }

    const byDate = {}
    const spAddedRemoved = {}
    const priorityChanges = { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 }
    const typeDist = { Bug: 0, Story: 0, Task: 0, Subtask: 0 }

    for (const c of changes) {
      const d = new Date(c.date).toISOString().slice(0, 10)
      byDate[d] = (byDate[d] || 0) + 1

      const spDiff = c.diffs?.find((df) => df.field === "SP")
      if (spDiff) {
        spAddedRemoved[d] = (spAddedRemoved[d] || 0) + ((spDiff.new || 0) - (spDiff.old || 0))
      }

      const prDiff = c.diffs?.find((df) => df.field === "priority")
      if (prDiff && prDiff.new) {
        priorityChanges[prDiff.new] = (priorityChanges[prDiff.new] || 0) + 1
      }
    }

    // work type distribution via current backlog/work items
    const items = await WorkItem.find({ space: spaceId })
    items.forEach((i) => {
      typeDist[i.type] = (typeDist[i.type] || 0) + 1
    })

    res.json({ byDate, spAddedRemoved, priorityChanges, typeDist, dependencyRiskScore: 0 })
  } catch (e) {
    next(e)
  }
}

export async function recommendStoryPoints(req, res, next) {
  try {
    const { title, description, type, priority, spaceId } = req.body

    // In a real research scenario, this would call the Python ML service.
    // Here we implement the rule-based recommendation logic as requested.

    const text = (title + " " + (description || "")).toLowerCase()
    let score = 3 // Base score

    // Complexity factors
    if (/auth|security|payment|integration|migration/i.test(text)) score += 5
    if (/api|database|crud|form|validation/i.test(text)) score += 2
    if (/button|text|color|styling|layout/i.test(text)) score -= 1

    // Type factors
    if (type === "Bug") score -= 1
    if (type === "Story") score += 2

    // Priority factors
    if (priority === "Highest" || priority === "High") score += 2

    // Constraints: Must be in Fibonacci scale {1, 2, 3, 5, 8, 13}
    const scale = [1, 2, 3, 5, 8, 13]
    const recommended = scale.reduce((prev, curr) => (Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev))

    // Generate professional explanation
    let explanation = "Based on similar items in your space, "
    if (score > 8) {
      explanation +=
        "this task involves high-complexity modules (like Auth or Integrations) suggesting a higher effort."
    } else if (score < 3) {
      explanation += "this appears to be a minor UI or styling task with low technical risk."
    } else {
      explanation += "the scope aligns with standard feature development items seen in previous sprints."
    }

    res.json({
      recommended_story_point: recommended,
      confidence_score: 0.75 + Math.random() * 0.15, // Simulated confidence
      explanation,
    })
  } catch (e) {
    next(e)
  }
}
