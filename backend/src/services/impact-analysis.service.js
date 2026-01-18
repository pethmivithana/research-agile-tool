/**
 * Impact Analysis Service - ML Service Integration (Final Version)
 * 
 * Pure ML service integration - no local heuristics
 * File: backend/src/services/impact-analysis.service.js
 */

import axios from "axios"
import { config } from "../config/env.js"

const mlServiceClient = axios.create({
  baseURL: config.PYTHON_SERVICE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
mlServiceClient.interceptors.request.use(
  (config) => {
    console.log(`🔵 [ML Service] ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error("❌ [ML Service] Request Error:", error.message)
    return Promise.reject(error)
  }
)

// Response interceptor
mlServiceClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [ML Service] Response received (${response.status})`)
    return response
  },
  (error) => {
    if (error.code === "ECONNREFUSED") {
      console.error("❌ [ML Service] Connection refused - Is ML service running on", config.PYTHON_SERVICE_URL, "?")
    } else if (error.code === "ETIMEDOUT") {
      console.error("❌ [ML Service] Request timeout")
    } else if (error.response) {
      console.error(`❌ [ML Service] Error ${error.response.status}:`, error.response.data)
    } else {
      console.error("❌ [ML Service] Error:", error.message)
    }
    return Promise.reject(error)
  }
)

function calculateDaysRemaining(sprint) {
  if (!sprint || !sprint.endDate) {
    console.log("⚠️  No sprint end date, using default 10 days")
    return 10.0
  }

  const now = new Date()
  const end = new Date(sprint.endDate)
  const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0.5, days)

  console.log(`📅 Days remaining in sprint: ${daysRemaining}`)
  return daysRemaining
}

function calculateDaysSinceStart(sprint) {
  if (!sprint || !sprint.startDate) {
    return 0
  }

  const now = new Date()
  const start = new Date(sprint.startDate)
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24))

  return Math.max(0, days)
}

function prepareTicketData(workItem, sprint = null) {
  console.log("\n" + "=".repeat(70))
  console.log("📦 Preparing Ticket Data for ML Service")
  console.log("=".repeat(70))

  const ticketData = {
    title: String(workItem.title || "Untitled"),
    description: String(workItem.description || ""),
    story_points: Number(workItem.storyPoints) || 1.0,
    priority: String(workItem.priority || "Medium"),
    issue_type: String(workItem.type || "Story"),
    total_links: Number(workItem.mlFeatures?.totalLinks || 0),
    total_comments: Number(workItem.mlFeatures?.totalComments || 0),
    days_since_sprint_start: sprint ? calculateDaysSinceStart(sprint) : 0,
    days_remaining: sprint ? calculateDaysRemaining(sprint) : 10.0,
    sprint_load_7d: Number(workItem.mlFeatures?.sprintLoad7d || 5),
    team_velocity_14d: Number(workItem.mlFeatures?.teamVelocity14d || sprint?.metrics?.velocity || 20.0),
    velocity_roll_5: Number(workItem.mlFeatures?.velocityRoll5 || 3.5),
    author_past_avg: Number(workItem.mlFeatures?.authorPastAvg || 4.0),
    author_workload_14d: Number(workItem.mlFeatures?.authorWorkload14d || 3.0),
  }

  console.log("Title:", ticketData.title)
  console.log("Story Points:", ticketData.story_points)
  console.log("Priority:", ticketData.priority)
  console.log("Type:", ticketData.issue_type)
  console.log("Days Remaining:", ticketData.days_remaining)
  console.log("=".repeat(70) + "\n")

  return ticketData
}

function calculateOverallRisk(mlResult) {
  const scheduleScore = mlResult.schedule_risk_probability * 100
  const qualityScore = mlResult.quality_risk_probability * 100
  const productivityScore = Math.min(100, mlResult.productivity_impact * 25)

  const overallScore = scheduleScore * 0.4 + qualityScore * 0.35 + productivityScore * 0.25

  let level = "Low"
  if (overallScore >= 70) level = "Critical"
  else if (overallScore >= 50) level = "High"
  else if (overallScore >= 30) level = "Medium"

  return {
    score: Number.parseFloat(overallScore.toFixed(1)),
    level,
  }
}

export async function performImpactAnalysis(workItem, sprint = null) {
  console.log("\n" + "=".repeat(70))
  console.log("🤖 CALLING ML SERVICE FOR IMPACT ANALYSIS")
  console.log("=".repeat(70))
  console.log("Work Item:", workItem.title)
  console.log("ML Service URL:", config.PYTHON_SERVICE_URL)

  try {
    const ticketData = prepareTicketData(workItem, sprint)

    console.log("📤 Sending request to ML service...")
    console.log("Endpoint: POST /analyze/mid-sprint-impact")

    const startTime = Date.now()
    const response = await mlServiceClient.post("/analyze/mid-sprint-impact", ticketData)
    const duration = Date.now() - startTime

    const mlResult = response.data

    console.log("\n✅ ML SERVICE RESPONSE RECEIVED")
    console.log("Duration:", duration, "ms")

    console.log("\n📊 ML MODEL PREDICTIONS:")
    console.log("  💪 Effort:", mlResult.predicted_hours, "hours")
    console.log("  📅 Schedule Risk:", mlResult.schedule_risk_label, `(${(mlResult.schedule_risk_probability * 100).toFixed(0)}%)`)
    console.log("  ⚡ Productivity Impact:", mlResult.productivity_impact, "days")
    console.log("  🎯 Quality Risk:", mlResult.quality_risk_label, `(${(mlResult.quality_risk_probability * 100).toFixed(0)}%)`)
    console.log("\n📈 Model Status:", JSON.stringify(mlResult.model_evidence, null, 2))

    const analysis = {
      workItem: {
        id: workItem._id,
        title: workItem.title,
        storyPoints: workItem.storyPoints,
      },
      effort: {
        estimatedHours: mlResult.predicted_hours,
        confidence: mlResult.confidence_interval || "ML Model",
        baseEffort: workItem.storyPoints * 8,
        multiplier: mlResult.predicted_hours / (workItem.storyPoints * 8 || 1),
      },
      scheduleRisk: {
        probability: mlResult.schedule_risk_probability,
        label: mlResult.schedule_risk_label,
        score: mlResult.schedule_risk_probability * 100,
        factors: [
          `ML Prediction: ${mlResult.schedule_risk_label}`,
          `Confidence: ${(mlResult.schedule_risk_probability * 100).toFixed(0)}%`,
        ],
      },
      productivity: {
        impactDays: mlResult.productivity_impact,
        percentageImpact: Math.round(mlResult.productivity_impact * 20),
        severity:
          mlResult.productivity_impact >= 3
            ? "Critical"
            : mlResult.productivity_impact >= 2
              ? "High"
              : mlResult.productivity_impact >= 1
                ? "Medium"
                : "Low",
        factors: [`ML Prediction: ${mlResult.productivity_impact.toFixed(1)} days productivity loss`],
      },
      qualityRisk: {
        probability: mlResult.quality_risk_probability,
        label: mlResult.quality_risk_label,
        score: mlResult.quality_risk_probability * 100,
        factors: [
          `ML Prediction: ${mlResult.quality_risk_label}`,
          `Defect Probability: ${(mlResult.quality_risk_probability * 100).toFixed(0)}%`,
        ],
      },
      overallRiskLevel: calculateOverallRisk(mlResult),
      mlMetadata: {
        modelEvidence: mlResult.model_evidence,
        analysisTimestamp: new Date(),
        mlServiceVersion: "2.0.1",
        allModelsUsed: Object.values(mlResult.model_evidence).every((v) => v === true),
      },
    }

    console.log("\n✅ Analysis transformation complete")
    console.log("Overall Risk:", analysis.overallRiskLevel.level, `(${analysis.overallRiskLevel.score.toFixed(1)})`)
    console.log("=".repeat(70) + "\n")

    return analysis
  } catch (error) {
    console.error("\n❌ ML SERVICE ERROR")
    console.error("=".repeat(70))
    console.error("Error Type:", error.code || error.name)
    console.error("Message:", error.message)

    if (error.response) {
      console.error("Status:", error.response.status)
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2))
    }

    console.error("=".repeat(70))

    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      console.error("\n🚨 CRITICAL ERROR: Cannot connect to ML service!")
      console.error("Please ensure:")
      console.error("  1. ML service is running: cd ml-service && python main.py")
      console.error("  2. ML service is on port 8000")
      console.error("  3. PYTHON_SERVICE_URL is set correctly in .env")
      console.error(`  4. Current URL: ${config.PYTHON_SERVICE_URL}`)

      throw new Error(
        `ML service unavailable at ${config.PYTHON_SERVICE_URL}. Please start the ML service and try again.`
      )
    }

    throw error
  }
}

export async function checkMLServiceHealth() {
  try {
    console.log("🏥 Checking ML service health...")
    const response = await mlServiceClient.get("/health", { timeout: 5000 })

    console.log("✅ ML service is healthy")
    console.log("Models loaded:", response.data.models_loaded)

    return {
      available: true,
      modelsLoaded: response.data.models_loaded,
      status: response.data.status,
    }
  } catch (error) {
    console.error("❌ ML service health check failed:", error.message)
    return {
      available: false,
      error: error.message,
    }
  }
}

export async function getMLServiceStatus() {
  try {
    const health = await checkMLServiceHealth()

    return {
      connected: health.available,
      url: config.PYTHON_SERVICE_URL,
      models: health.modelsLoaded || {},
      status: health.status || "unknown",
    }
  } catch (error) {
    return {
      connected: false,
      url: config.PYTHON_SERVICE_URL,
      error: error.message,
    }
  }
}