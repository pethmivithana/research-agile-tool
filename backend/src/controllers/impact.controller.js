import axios from "axios"
import WorkItem from "../models/WorkItem.js"
import Sprint from "../models/Sprint.js"
import mongoose from "mongoose"
import { config } from "../config/env.js"
import { validateTicketData, logValidationResult } from "../utils/debug-ml.js"
import { performImpactAnalysis } from "../services/impact-analysis.service.js"
import { generateRecommendation } from "../services/recommendation.service.js"

const PYTHON_SERVICE_URL = config.PYTHON_SERVICE_URL

const mlServiceClient = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: 15000,
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

  const preparedData = {
    title: String(itemData.title || "").trim(),
    description: String(itemData.description || "").trim(),
    story_points: Number.parseFloat(itemData.storyPoints) || 1.0,
    priority: String(itemData.priority || "Medium").trim(),
    issue_type: String(itemData.type || "Story").trim(),
    total_links: Number.parseInt(itemData.mlFeatures?.totalLinks || 0, 10),
    total_comments: Number.parseInt(itemData.mlFeatures?.totalComments || 0, 10),
    days_since_sprint_start: Number.parseInt(daysSinceStart, 10),
    days_remaining: Number.parseFloat(daysRemaining),
    sprint_load_7d: Number.parseInt(itemData.mlFeatures?.sprintLoad7d || 5, 10),
    team_velocity_14d: Number.parseFloat(itemData.mlFeatures?.teamVelocity14d || 20.0),
    velocity_roll_5: Number.parseFloat(itemData.mlFeatures?.velocityRoll5 || 3.5),
    author_past_avg: Number.parseFloat(itemData.mlFeatures?.authorPastAvg || 4.0),
    author_workload_14d: Number.parseFloat(itemData.mlFeatures?.authorWorkload14d || 3.0),
  }

  const validation = validateTicketData(preparedData)
  logValidationResult(validation)

  if (!validation.isValid) {
    console.error("[Impact] Validation failed:", validation.errors)
    throw new Error(`Data validation failed: ${validation.errors.join("; ")}`)
  }

  console.log("[Impact] Prepared data for ML service:", preparedData)
  return preparedData
}

async function getSprintContext(sprintId) {
  if (!sprintId) return null

  const sprint = await Sprint.findById(sprintId)
  if (!sprint) return null

  const items = await WorkItem.find({ sprint: sprintId })

  const now = new Date()
  const start = new Date(sprint.startDate)
  const end = new Date(sprint.endDate)

  const daysRemaining = Math.max(0.5, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
  const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24))

  const remainingCapacityHours = sprint.numberOfDevelopers * sprint.hoursPerDayPerDeveloper * daysRemaining

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
    days_since_start: daysSinceStart,
    remaining_capacity_hours: remainingCapacityHours,
    current_velocity: sprint.metrics?.velocity || 30,
    prev_sprint_velocity: sprint.metrics?.prevSprintVelocity || 30,
    completed_story_points: completedSP,
    remaining_story_points: remainingSP,
    committed_sp: sprint.metrics?.committedSP || 0,
    backlog_items: items.map((i) => ({
      id: i._id.toString(),
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
    console.log(`[Impact] Analyzing: "${ticketData.title}" (${ticketData.story_points} points)`)
    console.log("[Impact] Sending to ML Service:", JSON.stringify(ticketData, null, 2))

    const response = await mlServiceClient.post("/analyze/mid-sprint-impact", ticketData)
    const mlResult = response.data
    console.log(`[Impact] ML analysis completed`)

    const analysisResult = {
      predicted_hours: mlResult.predicted_hours,
      confidence_interval: mlResult.confidence_interval,
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

    let recommendations = null
    if (sprintId) {
      try {
        const sprintContext = await getSprintContext(sprintId)
        console.log(`[Impact] Sprint context retrieved`)

        const recResponse = await mlServiceClient.post("/recommendations/generate", {
          analysis_result: {
            predicted_hours: mlResult.predicted_hours,
            schedule_risk_probability: mlResult.schedule_risk_probability,
            quality_risk_probability: mlResult.quality_risk_probability,
            productivity_impact: mlResult.productivity_impact,
          },
          item_data: {
            title: ticketData.title,
            description: ticketData.description,
            story_points: ticketData.story_points,
            priority: ticketData.priority,
            type: ticketData.issue_type,
          },
          sprint_context: sprintContext,
        })
        recommendations = recResponse.data
        console.log(`[Impact] Recommendations generated: ${recommendations.primary_recommendation?.title}`)
      } catch (recError) {
        console.error("[Impact] Recommendation Error:", recError.message)
        if (recError.response?.data) {
          console.error("[Impact] Recommendation Response Data:", recError.response.data)
        }
      }
    }

    return res.json({
      ...analysisResult,
      recommendations,
      sprint_context: sprintId ? await getSprintContext(sprintId) : null,
    })
  } catch (error) {
    console.error("[Impact] ML Service Error:", error.message)
    if (error.response?.status === 400) {
      console.error("[Impact] Bad Request - Validation Error:", error.response.data)
      return res.status(400).json({
        error: "Data validation failed in ML service",
        details: error.response.data,
      })
    }

    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      console.warn("[Impact] ML service unavailable, using fallback predictions")
      return res.json({
        predicted_hours: ticketData.story_points * 8,
        confidence_interval: "Rule-Based",
        schedule_risk: { label: "Unknown", probability: 0 },
        productivity_impact: { days: "0", drop: "0%", raw_value: 0 },
        quality_risk: { label: "Unknown", probability: 0 },
        models_status: { effort: false, schedule: false, productivity: false, quality: false },
        recommendations: null,
        ml_service_error: "ML service unavailable. Using fallback.",
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

    const sprint = await Sprint.findById(sprintId).populate("space")

    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" })
    }

    if (sprint.status !== "active") {
      return res.status(400).json({
        error: "Sprint is not active",
        currentStatus: sprint.status,
        message: "Please start the sprint before analyzing impact",
      })
    }

    // Build work item from request
    const newWorkItem = {
      _id: new mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description || "",
      storyPoints: Number(req.body.storyPoints) || 1,
      priority: req.body.priority || "Medium",
      type: req.body.type || "Story",
      mlFeatures: {},
    }

    // Get all current sprint items
    const sprintItems = await WorkItem.find({ sprint: sprintId })

    // Perform impact analysis
    const analysis = await performImpactAnalysis(newWorkItem, {
      ...sprint.toObject(),
      backlog_items: sprintItems,
    })

    // Generate recommendations
    const recommendation = generateRecommendation(analysis, newWorkItem, sprint, sprintItems)

    return res.json({
      predicted_hours: analysis.effort?.estimatedHours || newWorkItem.storyPoints * 8,
      confidence_interval: analysis.effort?.confidence || 75,
      schedule_risk: {
        label: analysis.scheduleRisk?.label || "Unknown",
        probability: analysis.scheduleRisk?.probability || 0,
      },
      productivity_impact: {
        days: analysis.productivity?.impactDays?.toFixed(1) || "0",
        drop: `${(Number.parseFloat(analysis.productivity?.impactDays || 0) * 2).toFixed(0)}%`,
        raw_value: analysis.productivity?.impactDays || 0,
      },
      quality_risk: {
        label: analysis.qualityRisk?.label || "Unknown",
        probability: analysis.qualityRisk?.probability || 0,
      },
      models_status: {
        effort: true,
        schedule: true,
        productivity: true,
        quality: true,
      },
      recommendations: recommendation
        ? {
            primary_recommendation: {
              id: recommendation.primary?.id || "primary",
              title: recommendation.primary?.title || "Recommended Action",
              type: recommendation.primary?.type || "accept_with_mitigation",
              description: recommendation.primary?.description || "Proceed with standard practices",
              rationale: recommendation.primary?.rationale || "This is the safest approach",
              sub_tasks: recommendation.primary?.sub_tasks || [],
              affected_items: recommendation.primary?.affected_items || [],
            },
            alternative_options: (recommendation.alternatives || []).map((alt, idx) => ({
              id: alt.id || `alt_${idx}`,
              title: alt.title || "Alternative Action",
              type: alt.type || "defer_to_next_sprint",
              description: alt.description || "Consider this option",
              rationale: alt.rationale || "Another viable path",
              sub_tasks: alt.sub_tasks || [],
              affected_items: alt.affected_items || [],
            })),
          }
        : null,
      sprint_context: {
        id: sprint._id,
        name: sprint.name,
        status: sprint.status,
        daysRemaining: Math.ceil((new Date(sprint.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
        currentLoad: sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0),
        capacity: sprint.metrics?.committedSP || 30,
      },
    })
  } catch (e) {
    console.error("[Impact] Error in analyzeMidSprintImpact:", e)
    next(e)
  }
}

export async function applyRecommendation(req, res, next) {
  try {
    const { sprintId } = req.params
    const { option, itemData } = req.body

    console.log("[Apply] Received request:", { sprintId, optionType: option?.type, itemTitle: itemData?.title })

    if (!option || !option.type) {
      return res.status(400).json({ error: "Invalid option: type is required" })
    }

    if (!itemData || !itemData.title) {
      return res.status(400).json({ error: "Invalid itemData: title is required" })
    }

    const sprint = await Sprint.findById(sprintId)
    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" })
    }

    let message = ""
    const createdItems = []

    switch (option.type) {
      case "split_story":
        console.log("[Apply] Executing split_story")
        if (!option.sub_tasks || option.sub_tasks.length === 0) {
          return res.status(400).json({ error: "No subtasks provided for split operation" })
        }

        // Create first subtask for current sprint
        const firstSubtask = option.sub_tasks[0]
        const sub1 = await WorkItem.create({
          title: firstSubtask.title,
          description: itemData.description || `Part 1 of: ${itemData.title}`,
          storyPoints: firstSubtask.story_points,
          priority: itemData.priority || "Medium",
          type: itemData.type || "Story",
          status: "To Do",
          space: sprint.space,
          sprint: sprint._id,
          createdBy: req.user.id,
        })
        createdItems.push(sub1)
        console.log("[Apply] Created Part 1:", sub1.title)

        // Create remaining subtasks in backlog
        for (let i = 1; i < option.sub_tasks.length; i++) {
          const subtask = option.sub_tasks[i]
          const backlogItem = await WorkItem.create({
            title: subtask.title,
            description: itemData.description || `Part ${i + 1} of: ${itemData.title}`,
            storyPoints: subtask.story_points,
            priority: itemData.priority || "Medium",
            type: itemData.type || "Story",
            status: "Backlog",
            space: sprint.space,
            createdBy: req.user.id,
          })
          createdItems.push(backlogItem)
          console.log("[Apply] Created Part", i + 1, ":", backlogItem.title)
        }

        message = `Story split into ${option.sub_tasks.length} parts. Part 1 added to sprint, remaining parts in backlog.`
        break

      case "swap_priority":
        console.log("[Apply] Executing swap_priority")

        // Remove low priority items if specified
        if (option.affected_items && option.affected_items.length > 0) {
          const itemIdsToRemove = option.affected_items
            .map((item) => item.id)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))

          if (itemIdsToRemove.length > 0) {
            await WorkItem.updateMany({ _id: { $in: itemIdsToRemove } }, { status: "Backlog", sprint: null })
            console.log("[Apply] Removed", itemIdsToRemove.length, "items from sprint")
          }
        }

        // Add new item to sprint
        const newItem = await WorkItem.create({
          title: itemData.title,
          description: itemData.description || "",
          storyPoints: Number(itemData.storyPoints) || 1,
          priority: itemData.priority || "Highest",
          type: itemData.type || "Story",
          status: "To Do",
          space: sprint.space,
          sprint: sprint._id,
          createdBy: req.user.id,
        })
        createdItems.push(newItem)
        console.log("[Apply] Added new item to sprint:", newItem.title)

        message = `Sprint re-balanced. New critical item added.`
        break

      case "defer_to_next_sprint":
        console.log("[Apply] Executing defer_to_next_sprint")

        const backlogItem = await WorkItem.create({
          title: itemData.title,
          description: itemData.description || "",
          storyPoints: Number(itemData.storyPoints) || 1,
          priority: "High",
          type: itemData.type || "Story",
          status: "Backlog",
          space: sprint.space,
          createdBy: req.user.id,
        })
        createdItems.push(backlogItem)
        console.log("[Apply] Added to backlog:", backlogItem.title)

        message = "Requirement deferred to next sprint. Added to backlog."
        break

      case "accept_with_mitigation":
        console.log("[Apply] Executing accept_with_mitigation")

        const acceptedItem = await WorkItem.create({
          title: itemData.title,
          description: itemData.description || "",
          storyPoints: Number(itemData.storyPoints) || 1,
          priority: itemData.priority || "Medium",
          type: itemData.type || "Story",
          status: "To Do",
          space: sprint.space,
          sprint: sprint._id,
          createdBy: req.user.id,
        })
        createdItems.push(acceptedItem)
        console.log("[Apply] Added to sprint with mitigation:", acceptedItem.title)

        message = "Requirement added to sprint with mitigations."
        break

      default:
        console.log("[Apply] Unknown option type:", option.type)
        return res.status(400).json({ error: `Invalid recommendation type: ${option.type}` })
    }

    // Update sprint metrics
    const allItems = await WorkItem.find({ sprint: sprintId })
    const newCommittedSP = allItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0)

    sprint.metrics = {
      ...sprint.metrics,
      committedSP: newCommittedSP,
    }
    await sprint.save()

    console.log("[Apply] Success:", message)

    res.json({
      success: true,
      message,
      createdItems: createdItems.map((item) => ({
        id: item._id,
        title: item.title,
        storyPoints: item.storyPoints,
        status: item.status,
        sprint: item.sprint ? "Current Sprint" : "Backlog",
      })),
      updatedSprint: {
        id: sprint._id,
        name: sprint.name,
        workItemCount: allItems.length,
        committedSP: newCommittedSP,
      },
    })
  } catch (e) {
    console.error("[Apply] Error:", e)
    next(e)
  }
}

export async function batchAnalyzeItems(req, res, next) {
  try {
    const { sprintId, workItemIds } = req.body
    res.json({ message: "Batch analysis triggered", processed: workItemIds?.length || 0 })
  } catch (e) {
    next(e)
  }
}
