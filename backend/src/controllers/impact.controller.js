import axios from "axios"
import WorkItem from "../models/WorkItem.js"
import Sprint from "../models/Sprint.js"

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000"

async function prepareTicketData(workItem, sprint = null) {
  const data = {
    title: workItem.title || "",
    description: workItem.description || "",
    story_points: Number(workItem.storyPoints) || 0,
    priority: workItem.priority || "Medium",
    issue_type: workItem.type || "Story",
    days_since_start: 0,
    total_links: workItem.mlFeatures?.totalLinks || 0,
    total_comments: workItem.mlFeatures?.totalComments || 0,
    delta_story_points: workItem.mlFeatures?.deltaStoryPoints || 0,
    author_experience: workItem.mlFeatures?.authorExperience || 0,
    change_sequence_index: workItem.mlFeatures?.changeSequenceIndex || 0,
    is_weekend_change: workItem.mlFeatures?.isWeekendChange || 0,
    change_type: workItem.changeType || "Unknown", // Added changeType field to help models understand addition vs update
  }

  if (sprint) {
    if (sprint.startDate && sprint.status === "active") {
      const daysSinceStart = Math.floor((new Date() - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24))
      data.days_since_start = daysSinceStart
    }

    const sprintItems = await WorkItem.find({ sprint: sprint._id })
    const committedSP = sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0)

    const sprintDurationWeeks =
      sprint.duration === "1w" ? 1 : sprint.duration === "2w" ? 2 : sprint.duration === "3w" ? 3 : 4
    const estimatedCapacity = sprintDurationWeeks * 20

    data.sprint_capacity = estimatedCapacity
    data.sprint_committed_sp = committedSP
  }

  return data
}

export async function analyzeBacklogItem(req, res, next) {
  try {
    const { workItemId } = req.params

    const workItem = await WorkItem.findById(workItemId)
    if (!workItem) {
      return res.status(404).json({ error: "Work item not found" })
    }

    const ticketData = await prepareTicketData(workItem)

    console.log("[ML INTEGRATION] Calling ML service for backlog analysis")
    console.log("[ML INTEGRATION] Ticket data:", JSON.stringify(ticketData, null, 2))

    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze/backlog-item`, ticketData)

    console.log("[ML INTEGRATION] Response received:")
    console.log(`  - Effort Model: ${response.data.effort?.model_used || "unknown"}`)
    console.log(`  - Quality Model: ${response.data.quality_risk?.model_used || "unknown"}`)
    console.log(`  - Models Status:`, response.data.models_status)

    workItem.mlAnalysis = {
      complexityBadge: response.data.complexity_badge,
      effortEstimate: response.data.effort.predicted_hours,
      qualityRisk: response.data.quality_risk.probability,
      analyzedAt: new Date(),
      modelsUsed: {
        effort: response.data.effort.model_used,
        quality: response.data.quality_risk.model_used,
      },
    }
    await workItem.save()

    res.json(response.data)
  } catch (error) {
    console.error("[ML INTEGRATION] Error:", error.message)
    if (error.response) {
      console.error("[ML INTEGRATION] ML Service Response:", error.response.data)
    }
    next(error)
  }
}

export async function analyzeSprintLoad(req, res, next) {
  try {
    const { sprintId, workItemId } = req.params

    const [sprint, workItem] = await Promise.all([Sprint.findById(sprintId), WorkItem.findById(workItemId)])

    if (!sprint || !workItem) {
      return res.status(404).json({ error: "Sprint or work item not found" })
    }

    const ticketData = await prepareTicketData(workItem, sprint)

    console.log("[ML INTEGRATION] Analyzing sprint load impact")
    console.log("[ML INTEGRATION] Sprint:", sprint.name, "- Status:", sprint.status)
    console.log("[ML INTEGRATION] Days into sprint:", ticketData.days_since_start)

    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze/sprint-load`, ticketData)

    console.log("[ML INTEGRATION] Models used:")
    console.log(`  - Effort: ${response.data.effort?.model_used}`)
    console.log(`  - Quality: ${response.data.quality_risk?.model_used}`)
    console.log(`  - Productivity: ${response.data.productivity_impact?.model_used}`)

    res.json(response.data)
  } catch (error) {
    console.error("[ML INTEGRATION] Sprint Load Analysis Error:", error.message)
    next(error)
  }
}

export async function analyzeMidSprintImpact(req, res, next) {
  try {
    const { sprintId } = req.params
    const { title, description, storyPoints, priority, changeType } = req.body

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" })
    }

    if (sprint.status !== "active") {
      return res.status(400).json({ error: "Sprint is not active" })
    }

    const tempWorkItem = {
      title,
      description,
      storyPoints,
      priority: priority || "Medium",
      type: "Story",
      changeType, // Added changeType field to help models understand addition vs update
      mlFeatures: {
        totalLinks: 0,
        totalComments: 0,
        deltaStoryPoints: changeType === "Addition" ? storyPoints : 0,
        authorExperience: 0,
        changeSequenceIndex: 0,
        isWeekendChange: new Date().getDay() === 0 || new Date().getDay() === 6 ? 1 : 0,
      },
    }

    const ticketData = await prepareTicketData(tempWorkItem, sprint)
    ticketData.change_type = changeType // Add the changeType to ticketData for ML service

    console.log("\n" + "=".repeat(60))
    console.log("[ML INTEGRATION] MID-SPRINT IMPACT ANALYSIS")
    console.log("=".repeat(60))
    console.log("Sprint:", sprint.name)
    console.log("New Requirement:", title)
    console.log("Story Points:", storyPoints)
    console.log("Days into Sprint:", ticketData.days_since_start)
    console.log("Current Load:", `${ticketData.sprint_committed_sp}/${ticketData.sprint_capacity} SP`)
    console.log("Features sent (13):", Object.keys(ticketData).length)

    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze/mid-sprint-impact`, ticketData)

    console.log("\n[ML INTEGRATION] All 4 Models Applied:")
    console.log(`  1. Effort Model: ${response.data.model_evidence.effort_model_used ? "✅ Used" : "❌ Fallback"}`)
    console.log(`     → Predicted: ${response.data.predicted_hours}h`)
    console.log(
      `  2. Quality Risk Model: ${response.data.model_evidence.quality_model_used ? "✅ Used" : "❌ Fallback"}`,
    )
    console.log(`     → Risk Level: ${response.data.quality_risk_label}`)
    console.log(
      `  3. Productivity Model: ${response.data.model_evidence.productivity_model_used ? "✅ Used" : "❌ Fallback"}`,
    )
    console.log(`     → Impact: ${response.data.productivity_impact}%`)
    console.log(
      `  4. Schedule Risk Model: ${response.data.model_evidence.schedule_model_used ? "✅ Used" : "❌ Fallback"}`,
    )
    console.log(`     → Risk Level: ${response.data.schedule_risk_label}`)
    console.log("=".repeat(60) + "\n")

    const formattedResponse = {
      effort: {
        predicted_hours: response.data.predicted_hours,
        confidence: 0.85,
        status: response.data.predicted_hours > 40 ? "High" : "Medium",
        model_used: response.data.model_evidence.effort_model_used ? "TabNet Regressor" : "Rule-based",
      },
      schedule_risk: {
        probability: response.data.schedule_risk_probability,
        risk_level: response.data.schedule_risk_label,
        factors: [],
        model_used: response.data.model_evidence.schedule_model_used ? "XGBoost Classifier" : "Rule-based",
      },
      quality_risk: {
        probability: response.data.quality_risk_probability,
        risk_level: response.data.quality_risk_label,
        factors: [],
        model_used: response.data.model_evidence.quality_model_used ? "TabNet Classifier" : "Rule-based",
      },
      productivity_impact: {
        impact_percentage: response.data.productivity_impact,
        status: response.data.productivity_impact < -10 ? "Significant Drop" : "Moderate",
        model_used: response.data.model_evidence.productivity_model_used ? "PyTorch MLP" : "Rule-based",
      },
      decision:
        response.data.schedule_risk_probability > 0.7
          ? "⛔ DO NOT ADD - HIGH RISK"
          : response.data.schedule_risk_probability > 0.4
            ? "⚠️ PROCEED WITH CAUTION"
            : "✅ SAFE TO ADD",
      reasons: [
        `Predicted effort: ${response.data.predicted_hours} hours`,
        `Schedule risk: ${(response.data.schedule_risk_probability * 100).toFixed(0)}%`,
        `Quality risk: ${(response.data.quality_risk_probability * 100).toFixed(0)}%`,
      ],
      analysis_summary: {
        predicted_hours: response.data.predicted_hours,
        hours_available: 40,
        spillover_probability: `${(response.data.schedule_risk_probability * 100).toFixed(0)}%`,
        productivity_drop: `${Math.abs(response.data.productivity_impact).toFixed(1)}%`,
      },
      models_status: response.data.model_evidence,
    }

    res.json(formattedResponse)
  } catch (error) {
    console.error("[ML INTEGRATION] Mid-Sprint Analysis Error:", error.message)
    if (error.response) {
      console.error("[ML INTEGRATION] ML Service Response:", error.response.data)
    }
    next(error)
  }
}

export async function batchAnalyzeItems(req, res, next) {
  try {
    const { sprintId, workItemIds } = req.body

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" })
    }

    const workItems = await WorkItem.find({ _id: { $in: workItemIds } })

    // Analyze each item
    const analyses = await Promise.all(
      workItems.map(async (item) => {
        try {
          const ticketData = await prepareTicketData(item, sprint)
          const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze/sprint-load`, ticketData)
          return {
            workItemId: item._id,
            title: item.title,
            analysis: response.data,
          }
        } catch (err) {
          return {
            workItemId: item._id,
            title: item.title,
            error: err.message,
          }
        }
      }),
    )

    res.json({ analyses })
  } catch (error) {
    console.error("[v0] Batch Analysis Error:", error.message)
    next(error)
  }
}
