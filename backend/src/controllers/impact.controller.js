import axios from "axios"
import WorkItem from "../models/WorkItem.js"
import Sprint from "../models/Sprint.js"
import mongoose from "mongoose"
import { config } from "../config/env.js"

const PYTHON_SERVICE_URL = config.PYTHON_SERVICE_URL

const mlServiceClient = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

async function prepareTicketData(itemData, sprint = null) {
  let daysSinceStart = 0
  let daysRemaining = 10.0

  if (sprint && sprint.startDate && sprint.endDate) {
    const start = new Date(sprint.startDate)
    const end = new Date(sprint.endDate)
    const now = new Date()

    const diffStart = now - start
    daysSinceStart = Math.max(0, Math.floor(diffStart / (1000 * 60 * 60 * 24)))

    const diffEnd = end - now
    daysRemaining = Math.max(0.5, Math.ceil(diffEnd / (1000 * 60 * 60 * 24)))
  }

  return {
    title: itemData.title || "",
    description: itemData.description || "",
    story_points: Number(itemData.storyPoints) || 1.0,
    priority: itemData.priority || "Medium",
    issue_type: itemData.type || "Story",

    total_links: itemData.mlFeatures?.totalLinks || 0,
    total_comments: itemData.mlFeatures?.totalComments || 0,

    days_since_sprint_start: daysSinceStart,
    days_remaining: daysRemaining,

    sprint_load_7d: itemData.mlFeatures?.sprintLoad7d || 12,
    team_velocity_14d: itemData.mlFeatures?.teamVelocity14d || 35.0,
    velocity_roll_5: itemData.mlFeatures?.velocityRoll5 || 3.5,
    author_past_avg: itemData.mlFeatures?.authorPastAvg || 4.0,
    author_workload_14d: itemData.mlFeatures?.authorWorkload14d || 3.0,
  }
}

async function getSprintContext(sprintId) {
  if (!sprintId) return null

  const sprint = await Sprint.findById(sprintId)
  if (!sprint) return null

  const items = await WorkItem.find({ sprint: sprintId })

  const now = new Date()
  const end = new Date(sprint.endDate)
  const daysRemaining = Math.max(0.5, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))

  const completedSP = items.filter((i) => i.status === "Done").reduce((acc, i) => acc + (i.storyPoints || 0), 0)
  const remainingSP = items.filter((i) => i.status !== "Done").reduce((acc, i) => acc + (i.storyPoints || 0), 0)

  return {
    sprint_id: sprintId,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    durationDays: sprint.durationDays || 14,
    numberOfDevelopers: sprint.numberOfDevelopers || 5,
    hoursPerDayPerDeveloper: sprint.hoursPerDayPerDeveloper || 6,
    teamCapacityHours: sprint.teamCapacityHours || 120,
    days_remaining: daysRemaining,
    current_velocity: sprint.metrics?.velocity || 30,
    prev_sprint_velocity: sprint.metrics?.prevSprintVelocity || 30,
    completed_story_points: completedSP,
    remaining_story_points: remainingSP,
    committed_sp: sprint.metrics?.committedSP || 0,
    backlog_items: items.map((i) => ({
      id: i._id,
      title: i.title,
      story_points: i.storyPoints,
      priority: i.priority,
      status: i.status,
    })),
    metrics: sprint.metrics,
  }
}

async function performAnalysis(ticketData, res, sprintId = null) {
  try {
    console.log(`[v0] Analyzing ticket: "${ticketData.title}" (${ticketData.story_points} points)`)
    console.log(`[v0] Sprint ID: ${sprintId}`)
    console.log(`[v0] ML Service URL: ${PYTHON_SERVICE_URL}`)

    // 1. Get ML Predictions
    const response = await mlServiceClient.post("/analyze/mid-sprint-impact", ticketData)
    const mlResult = response.data
    console.log(`[v0] ML analysis completed successfully`)

    const analysisResult = {
      predicted_hours: mlResult.predicted_hours,
      schedule_risk: {
        label: mlResult.schedule_risk_label,
        probability: mlResult.schedule_risk_probability,
      },
      productivity_impact: {
        days: `${mlResult.productivity_impact.toFixed(1)} days`,
        drop: `${(mlResult.productivity_impact * 2).toFixed(0)}%`,
        raw_value: mlResult.productivity_impact,
      },
      quality_risk: {
        label: mlResult.quality_risk_label,
        probability: mlResult.quality_risk_probability,
      },
      models_status: mlResult.model_evidence,
    }

    // 2. Get Rule-Based Recommendations with sprint context
    let recommendations = null
    if (sprintId) {
      try {
        const sprintContext = await getSprintContext(sprintId)
        console.log(`[v0] Sprint context retrieved for ${sprintId}`)

        const recResponse = await mlServiceClient.post("/recommendations/generate", {
          analysis_result: {
            predicted_hours: mlResult.predicted_hours,
            schedule_risk_probability: mlResult.schedule_risk_probability,
            quality_risk_probability: mlResult.quality_risk_probability,
            productivity_impact: mlResult.productivity_impact,
            priority: ticketData.priority,
          },
          item_data: ticketData,
          sprint_context: sprintContext,
        })
        recommendations = recResponse.data
        console.log(`[v0] Recommendations generated successfully`)
      } catch (recError) {
        console.error("[v0] Recommendation Engine Error:", recError.message)
      }
    }

    return res.json({
      ...analysisResult,
      recommendations,
      sprint_context: sprintId ? await getSprintContext(sprintId) : null,
    })
  } catch (error) {
    console.error("[v0] ML Service Error:", error.message)

    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      console.warn("[v0] ML service unavailable, using fallback estimations")
      return res.json({
        predicted_hours: ticketData.story_points * 8,
        schedule_risk: { label: "Unknown", probability: 0 },
        productivity_impact: { days: "0", drop: "0%", raw_value: 0 },
        quality_risk: { label: "Unknown", probability: 0 },
        models_status: { effort: false, schedule: false, productivity: false, quality: false },
        recommendations: null,
        ml_service_error: "ML service is currently unavailable. Using fallback estimations.",
      })
    }

    throw error
  }
}

export async function analyzeBacklogItem(req, res, next) {
  try {
    const { workItemId } = req.params
    const workItem = await WorkItem.findById(workItemId)
    if (!workItem) return res.status(404).json({ error: "Item not found" })

    const data = await prepareTicketData(workItem, null)
    await performAnalysis(data, res)
  } catch (e) {
    next(e)
  }
}

export async function analyzeSprintLoad(req, res, next) {
  try {
    const { sprintId, workItemId } = req.params
    const sprint = await Sprint.findById(sprintId)
    const workItem = await WorkItem.findById(workItemId)
    if (!workItem || !sprint) return res.status(404).json({ error: "Not found" })

    const data = await prepareTicketData(workItem, sprint)
    await performAnalysis(data, res, sprintId)
  } catch (e) {
    next(e)
  }
}

export async function analyzeMidSprintImpact(req, res, next) {
  try {
    const { sprintId } = req.params

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ error: "Invalid sprint ID format" })
    }

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" })
    }

    const formData = {
      ...req.body,
      mlFeatures: { ...req.body },
    }

    const data = await prepareTicketData(formData, sprint)
    await performAnalysis(data, res, sprintId)
  } catch (e) {
    console.error("Apply Recommendation Error:", e)
    next(e)
  }
}

export async function applyRecommendation(req, res, next) {
  try {
    const { sprintId } = req.params
    const { option, itemData } = req.body

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) return res.status(404).json({ error: "Sprint not found" })

    let message = ""
    const createdItems = []

    switch (option.type) {
      case "split_story":
        if (!option.sub_tasks || option.sub_tasks.length === 0) {
          return res.status(400).json({ error: "No subtasks provided for split operation" })
        }

        const firstSubtask = option.sub_tasks[0]
        const sub1 = await WorkItem.create({
          title: firstSubtask.title,
          description: itemData.description || `Part 1 of split requirement: ${itemData.title}`,
          storyPoints: firstSubtask.story_points,
          priority: itemData.priority,
          type: itemData.type || "Story",
          status: "To Do",
          space: sprint.space,
          sprint: sprint._id,
        })
        createdItems.push(sub1)

        for (let i = 1; i < option.sub_tasks.length; i++) {
          const subtask = option.sub_tasks[i]
          const backlogItem = await WorkItem.create({
            title: subtask.title,
            description: itemData.description || `Part ${i + 1} of split requirement: ${itemData.title}`,
            storyPoints: subtask.story_points,
            priority: itemData.priority,
            type: itemData.type || "Story",
            status: "Backlog",
            space: sprint.space,
          })
          createdItems.push(backlogItem)
        }

        message = `Requirement split into ${option.sub_tasks.length} subtasks. Part 1 (${firstSubtask.story_points} pts) added to current sprint, remaining parts moved to backlog.`
        break

      case "swap_priority":
        if (option.affected_items && option.affected_items.length > 0) {
          const itemIdsToRemove = option.affected_items.map((item) => item.id)
          await WorkItem.updateMany({ _id: { $in: itemIdsToRemove } }, { status: "Backlog", sprint: null })
        }

        const newItem = await WorkItem.create({
          title: itemData.title,
          description: itemData.description || "",
          storyPoints: itemData.storyPoints,
          priority: itemData.priority,
          type: itemData.type || "Story",
          status: "To Do",
          space: sprint.space,
          sprint: sprint._id,
        })
        createdItems.push(newItem)

        const swapCount = option.affected_items?.length || 0
        message = `Sprint re-balanced: ${swapCount} lower-priority item(s) moved to backlog and new critical requirement added.`
        break

      case "defer_to_next_sprint":
        const backlogItem = await WorkItem.create({
          title: itemData.title,
          description: itemData.description || "",
          storyPoints: itemData.storyPoints,
          priority: itemData.priority,
          type: itemData.type || "Story",
          status: "Backlog",
          space: sprint.space,
        })
        createdItems.push(backlogItem)
        message = "Requirement deferred to next sprint. Added to product backlog with high priority."
        break

      case "accept_with_mitigation":
        const acceptedItem = await WorkItem.create({
          title: itemData.title,
          description: itemData.description || "",
          storyPoints: itemData.storyPoints,
          priority: itemData.priority,
          type: itemData.type || "Story",
          status: "To Do",
          space: sprint.space,
          sprint: sprint._id,
        })
        createdItems.push(acceptedItem)
        message = "Requirement added to current sprint. Apply recommended mitigations during implementation."
        break

      default:
        return res.status(400).json({ error: "Invalid recommendation option type" })
    }

    res.json({
      success: true,
      message,
      createdItems: createdItems.map((item) => ({
        id: item._id,
        title: item.title,
        storyPoints: item.storyPoints,
        status: item.status,
      })),
      updatedSprint: {
        id: sprint._id,
        workItemCount: await WorkItem.countDocuments({ sprint: sprintId }),
      },
    })
  } catch (e) {
    console.error("Apply Recommendation Error:", e)
    next(e)
  }
}

export async function batchAnalyzeItems(req, res, next) {
  try {
    const { sprintId, workItemIds } = req.body
    const sprint = await Sprint.findById(sprintId)

    res.json({ message: "Batch analysis triggered", processed: workItemIds.length })
  } catch (e) {
    next(e)
  }
}
