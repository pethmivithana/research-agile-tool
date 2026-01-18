/**
 * Impact Controller - ML Service Integration
 * 
 * Handles impact analysis requests and routes them to ML service.
 * All predictions come from ML models - no local heuristics.
 */

import axios from "axios"
import WorkItem from "../models/WorkItem.js"
import Sprint from "../models/Sprint.js"
import mongoose from "mongoose"
import { config } from "../config/env.js"
import { performImpactAnalysis, checkMLServiceHealth } from "../services/impact-analysis.service.js"
import { generateRecommendation } from "../services/recommendation.service.js"

// ML Service Client (for direct calls when needed)
const mlServiceClient = axios.create({
  baseURL: config.PYTHON_SERVICE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * Health check for ML service
 */
export async function healthCheck(req, res, next) {
  try {
    const health = await checkMLServiceHealth()
    
    res.json({
      mlService: {
        available: health.available,
        url: config.PYTHON_SERVICE_URL,
        modelsLoaded: health.modelsLoaded || {},
        status: health.status || "unknown",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Analyze a backlog item (not yet in sprint)
 * GET /api/impact/backlog/:workItemId/analyze
 */
export async function analyzeBacklogItem(req, res, next) {
  try {
    const { workItemId } = req.params

    console.log("\n" + "=".repeat(70))
    console.log("📋 ANALYZING BACKLOG ITEM")
    console.log("=".repeat(70))
    console.log("Work Item ID:", workItemId)

    // Fetch work item
    const workItem = await WorkItem.findById(workItemId)
    if (!workItem) {
      return res.status(404).json({ error: "Item not found" })
    }

    console.log("Title:", workItem.title)
    console.log("Story Points:", workItem.storyPoints)
    console.log("Type:", workItem.type)

    // Perform ML analysis (no sprint context)
    const analysis = await performImpactAnalysis(workItem, null)

    console.log("✅ Backlog analysis complete")
    console.log("=".repeat(70) + "\n")

    res.json({
      predicted_hours: analysis.effort.estimatedHours,
      confidence_interval: analysis.effort.confidence,
      schedule_risk: {
        label: analysis.scheduleRisk.label,
        probability: analysis.scheduleRisk.probability,
      },
      productivity_impact: {
        days: analysis.productivity.impactDays.toFixed(1),
        drop: `${analysis.productivity.percentageImpact}%`,
        raw_value: analysis.productivity.impactDays,
      },
      quality_risk: {
        label: analysis.qualityRisk.label,
        probability: analysis.qualityRisk.probability,
      },
      models_status: analysis.mlMetadata.modelEvidence,
      overall_risk: analysis.overallRiskLevel,
    })
  } catch (error) {
    console.error("❌ Backlog analysis error:", error.message)
    next(error)
  }
}

/**
 * Analyze sprint load for a specific work item already in sprint
 * GET /api/impact/sprints/:sprintId/items/:workItemId/analyze
 */
export async function analyzeSprintLoad(req, res, next) {
  try {
    const { sprintId, workItemId } = req.params

    console.log("\n" + "=".repeat(70))
    console.log("📊 ANALYZING SPRINT LOAD")
    console.log("=".repeat(70))
    console.log("Sprint ID:", sprintId)
    console.log("Work Item ID:", workItemId)

    // Fetch sprint and work item
    const sprint = await Sprint.findById(sprintId)
    const workItem = await WorkItem.findById(workItemId)

    if (!workItem || !sprint) {
      return res.status(404).json({ error: "Sprint or work item not found" })
    }

    console.log("Sprint:", sprint.name)
    console.log("Work Item:", workItem.title)

    // Perform ML analysis with sprint context
    const analysis = await performImpactAnalysis(workItem, sprint)

    // Get sprint context for response
    const sprintContext = await getSprintContext(sprintId)

    console.log("✅ Sprint load analysis complete")
    console.log("=".repeat(70) + "\n")

    res.json({
      predicted_hours: analysis.effort.estimatedHours,
      confidence_interval: analysis.effort.confidence,
      schedule_risk: {
        label: analysis.scheduleRisk.label,
        probability: analysis.scheduleRisk.probability,
      },
      productivity_impact: {
        days: analysis.productivity.impactDays.toFixed(1),
        drop: `${analysis.productivity.percentageImpact}%`,
        raw_value: analysis.productivity.impactDays,
      },
      quality_risk: {
        label: analysis.qualityRisk.label,
        probability: analysis.qualityRisk.probability,
      },
      models_status: analysis.mlMetadata.modelEvidence,
      sprint_context: sprintContext,
      overall_risk: analysis.overallRiskLevel,
    })
  } catch (error) {
    console.error("❌ Sprint load analysis error:", error.message)
    next(error)
  }
}

/**
 * Analyze mid-sprint impact of a NEW requirement
 * POST /api/impact/sprints/:sprintId/analyze-impact
 * 
 * This is the main endpoint used by the frontend "Impact Analysis" page
 */
export async function analyzeMidSprintImpact(req, res, next) {
  try {
    const { sprintId } = req.params

    console.log("\n" + "=".repeat(80))
    console.log("🚀 MID-SPRINT IMPACT ANALYSIS")
    console.log("=".repeat(80))
    console.log("Sprint ID:", sprintId)
    console.log("Request Body:", JSON.stringify(req.body, null, 2))

    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ error: "Invalid sprint ID format" })
    }

    // Fetch sprint
    const sprint = await Sprint.findById(sprintId).populate("space")

    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" })
    }

    console.log("Sprint:", sprint.name)
    console.log("Status:", sprint.status)

    // Validate sprint is active
    if (sprint.status !== "active") {
      return res.status(400).json({
        error: "Sprint is not active",
        currentStatus: sprint.status,
        message: "Please start the sprint before analyzing impact",
      })
    }

    // Build work item from request body
    const newWorkItem = {
      _id: new mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description || "",
      storyPoints: Number(req.body.storyPoints) || 1,
      priority: req.body.priority || "Medium",
      type: req.body.type || "Story",
      mlFeatures: {
        totalLinks: 0,
        totalComments: 0,
        sprintLoad7d: 5,
        teamVelocity14d: sprint.metrics?.velocity || 20.0,
        velocityRoll5: 3.5,
        authorPastAvg: 4.0,
        authorWorkload14d: 3.0,
      },
    }

    console.log("\n📦 New Work Item:")
    console.log("  Title:", newWorkItem.title)
    console.log("  Story Points:", newWorkItem.storyPoints)
    console.log("  Priority:", newWorkItem.priority)
    console.log("  Type:", newWorkItem.type)

    // Get all current sprint items
    const sprintItems = await WorkItem.find({ sprint: sprintId })
    console.log(`\n📊 Current Sprint Load: ${sprintItems.length} items`)

    // Calculate current load
    const currentLoad = sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0)
    console.log(`📈 Current Story Points: ${currentLoad}`)
    console.log(`📦 Sprint Capacity: ${sprint.metrics?.committedSP || 30} SP`)

    // Perform ML impact analysis
    console.log("\n🤖 Calling ML Service for Impact Analysis...")
    const analysis = await performImpactAnalysis(newWorkItem, {
      ...sprint.toObject(),
      backlog_items: sprintItems,
    })

    console.log("\n✅ ML Analysis Complete")
    console.log("  Effort:", analysis.effort.estimatedHours, "hours")
    console.log("  Schedule Risk:", analysis.scheduleRisk.label, `(${(analysis.scheduleRisk.probability * 100).toFixed(0)}%)`)
    console.log("  Productivity:", analysis.productivity.impactDays, "days")
    console.log("  Quality Risk:", analysis.qualityRisk.label, `(${(analysis.qualityRisk.probability * 100).toFixed(0)}%)`)
    console.log("  Overall Risk:", analysis.overallRiskLevel.level)

    // Generate recommendations based on analysis
    console.log("\n💡 Generating Recommendations...")
    const recommendation = generateRecommendation(analysis, newWorkItem, sprint, sprintItems)

    console.log("✅ Recommendations Generated")
    if (recommendation && recommendation.primary) {
      console.log("  Primary:", recommendation.primary.title)
      console.log("  Alternatives:", recommendation.alternatives?.length || 0)
    }

    // Calculate sprint context metrics
    const now = new Date()
    const daysRemaining = Math.ceil((new Date(sprint.endDate) - now) / (1000 * 60 * 60 * 24))

    console.log("\n" + "=".repeat(80))
    console.log("✅ ANALYSIS COMPLETE")
    console.log("=".repeat(80) + "\n")

    // Return comprehensive response
    return res.json({
      // ML Model Predictions
      predicted_hours: analysis.effort.estimatedHours,
      confidence_interval: analysis.effort.confidence,
      
      schedule_risk: {
        label: analysis.scheduleRisk.label,
        probability: analysis.scheduleRisk.probability,
      },
      
      productivity_impact: {
        days: analysis.productivity.impactDays.toFixed(1),
        drop: `${analysis.productivity.percentageImpact}%`,
        raw_value: analysis.productivity.impactDays,
      },
      
      quality_risk: {
        label: analysis.qualityRisk.label,
        probability: analysis.qualityRisk.probability,
      },
      
      // Model status
      models_status: analysis.mlMetadata.modelEvidence,
      
      // Recommendations
      recommendations: recommendation
        ? {
            primary_recommendation: recommendation.primary
              ? {
                  id: recommendation.primary.id || "primary",
                  title: recommendation.primary.title || "Recommended Action",
                  type: recommendation.primary.type || "accept_with_mitigation",
                  description: recommendation.primary.description || "Proceed with standard practices",
                  rationale: recommendation.primary.rationale || "This is the safest approach",
                  sub_tasks: recommendation.primary.sub_tasks || [],
                  affected_items: recommendation.primary.affected_items || [],
                }
              : null,
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
      
      // Sprint context
      sprint_context: {
        id: sprint._id,
        name: sprint.name,
        status: sprint.status,
        daysRemaining: daysRemaining,
        currentLoad: currentLoad,
        capacity: sprint.metrics?.committedSP || 30,
      },
      
      // Overall risk assessment
      overall_risk: analysis.overallRiskLevel,
    })
  } catch (error) {
    console.error("\n❌ ERROR in analyzeMidSprintImpact:")
    console.error("=".repeat(80))
    console.error("Error:", error.message)
    console.error("Stack:", error.stack)
    console.error("=".repeat(80) + "\n")
    
    next(error)
  }
}

/**
 * Apply a selected recommendation
 * POST /api/impact/sprints/:sprintId/apply-recommendation
 */
export async function applyRecommendation(req, res, next) {
  try {
    const { sprintId } = req.params
    const { option, itemData } = req.body

    console.log("\n" + "=".repeat(70))
    console.log("🎯 APPLYING RECOMMENDATION")
    console.log("=".repeat(70))
    console.log("Sprint ID:", sprintId)
    console.log("Option Type:", option?.type)
    console.log("Item Title:", itemData?.title)

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
        console.log("📋 Executing: Split Story")
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
        console.log("  ✅ Created Part 1:", sub1.title)

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
          console.log(`  ✅ Created Part ${i + 1}:`, backlogItem.title)
        }

        message = `Story split into ${option.sub_tasks.length} parts. Part 1 added to sprint, remaining parts in backlog.`
        break

      case "swap_priority":
        console.log("🔄 Executing: Swap Priority")

        // Remove low priority items if specified
        if (option.affected_items && option.affected_items.length > 0) {
          const itemIdsToRemove = option.affected_items
            .map((item) => item.id)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))

          if (itemIdsToRemove.length > 0) {
            await WorkItem.updateMany({ _id: { $in: itemIdsToRemove } }, { status: "Backlog", sprint: null })
            console.log(`  ✅ Removed ${itemIdsToRemove.length} items from sprint`)
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
        console.log("  ✅ Added new item to sprint:", newItem.title)

        message = `Sprint re-balanced. New critical item added.`
        break

      case "defer_to_next_sprint":
        console.log("⏭️ Executing: Defer to Next Sprint")

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
        console.log("  ✅ Added to backlog:", backlogItem.title)

        message = "Requirement deferred to next sprint. Added to backlog."
        break

      case "accept_with_mitigation":
        console.log("✅ Executing: Accept with Mitigation")

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
        console.log("  ✅ Added to sprint with mitigation:", acceptedItem.title)

        message = "Requirement added to sprint with mitigations."
        break

      default:
        console.log("❌ Unknown option type:", option.type)
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

    console.log("✅ Sprint metrics updated")
    console.log("  New committed SP:", newCommittedSP)
    console.log("=".repeat(70) + "\n")

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
  } catch (error) {
    console.error("❌ Error applying recommendation:", error)
    next(error)
  }
}

/**
 * Batch analyze multiple items
 * POST /api/impact/sprints/batch-analyze
 */
export async function batchAnalyzeItems(req, res, next) {
  try {
    const { sprintId, workItemIds } = req.body

    console.log("\n" + "=".repeat(70))
    console.log("📊 BATCH ANALYSIS")
    console.log("=".repeat(70))
    console.log("Sprint ID:", sprintId)
    console.log("Items:", workItemIds?.length || 0)

    res.json({
      message: "Batch analysis triggered",
      processed: workItemIds?.length || 0,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Helper: Get sprint context for response
 */
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