import axios from "axios"
import WorkItem from "../models/WorkItem.js"
import Sprint from "../models/Sprint.js"

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000"

// --- HELPER: Prepare Data for ML ---
async function prepareTicketData(itemData, sprint = null) {
  // Calculate Time Metrics
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

  // Construct Python Payload (snake_case)
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
    
    // Research Context Features (Default values used if not in DB)
    sprint_load_7d: itemData.mlFeatures?.sprintLoad7d || 12,
    team_velocity_14d: itemData.mlFeatures?.teamVelocity14d || 35.0,
    velocity_roll_5: itemData.mlFeatures?.velocityRoll5 || 3.5,
    author_past_avg: itemData.mlFeatures?.authorPastAvg || 4.0,
    author_workload_14d: itemData.mlFeatures?.authorWorkload14d || 3.0
  }
}

// --- HELPER: Call ML Service & Format ---
async function performAnalysis(ticketData, res) {
  try {
    console.log(`[ML] Sending: ${ticketData.title} (Points: ${ticketData.story_points})`)
    
    const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze/mid-sprint-impact`, ticketData)
    const mlResult = response.data

    return res.json({
      predicted_hours: mlResult.predicted_hours,
      schedule_risk: {
        label: mlResult.schedule_risk_label,
        probability: `${(mlResult.schedule_risk_probability * 100).toFixed(0)}%`,
      },
      productivity_impact: {
        days: `${mlResult.productivity_impact.toFixed(1)} days`,
        drop: `${(mlResult.productivity_impact * 2).toFixed(0)}%`, 
      },
      quality_risk: {
        label: mlResult.quality_risk_label,
        probability: `${(mlResult.quality_risk_probability * 100).toFixed(0)}%`,
      },
      models_status: mlResult.model_evidence,
    })
  } catch (error) {
    console.error("⚠️ ML Service Error:", error.message)
    // Return Fallback
    return res.json({
      predicted_hours: ticketData.story_points * 8,
      schedule_risk: { label: "Unknown", probability: "0%" },
      productivity_impact: { days: "0", drop: "0%" },
      quality_risk: { label: "Unknown", probability: "0%" },
      models_status: { effort: false, schedule: false, productivity: false, quality: false }
    })
  }
}

// --- EXPORTED CONTROLLERS ---

// 1. Analyze existing backlog item (GET)
export async function analyzeBacklogItem(req, res, next) {
  try {
    const { workItemId } = req.params
    const workItem = await WorkItem.findById(workItemId)
    if (!workItem) return res.status(404).json({ error: "Item not found" })
    
    const data = await prepareTicketData(workItem, null) // No sprint context
    await performAnalysis(data, res)
  } catch (e) { next(e) }
}

// 2. Analyze item in active sprint (GET)
export async function analyzeSprintLoad(req, res, next) {
  try {
    const { sprintId, workItemId } = req.params
    const sprint = await Sprint.findById(sprintId)
    const workItem = await WorkItem.findById(workItemId)
    if (!workItem || !sprint) return res.status(404).json({ error: "Not found" })

    const data = await prepareTicketData(workItem, sprint)
    await performAnalysis(data, res)
  } catch (e) { next(e) }
}

// 3. Analyze hypothetical/new item (POST)
export async function analyzeMidSprintImpact(req, res, next) {
  try {
    const { sprintId } = req.params
    const sprint = await Sprint.findById(sprintId)
    // Merge body data (from form) with defaults
    const formData = {
        ...req.body,
        mlFeatures: { ...req.body } // Map form fields to mlFeatures for the helper
    }
    
    const data = await prepareTicketData(formData, sprint)
    await performAnalysis(data, res)
  } catch (e) { next(e) }
}

// 4. Batch Analysis (POST)
export async function batchAnalyzeItems(req, res, next) {
  try {
    const { sprintId, workItemIds } = req.body
    const sprint = await Sprint.findById(sprintId)
    
    // Placeholder response for batch (to avoid crashing)
    res.json({ message: "Batch analysis triggered", processed: workItemIds.length })
  } catch (e) { next(e) }
}