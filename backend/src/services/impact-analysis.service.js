/**
 * Impact Analysis Service - Implements 4-Model Impact Assessment
 * Models: Effort, Quality Risk, Schedule Risk, Productivity
 */

// ===== EFFORT MODEL =====
// Estimates effort required using story points and complexity heuristics
export function analyzeEffort(workItem, sprint = null) {
  const { storyPoints = 1, priority, type, description = "" } = workItem

  const baseEffort = storyPoints * 8 // hours (standard: 1 SP = 8 hours)
  let multiplier = 1.0

  // Priority factor
  const priorityMultiplier = {
    Highest: 1.2,
    High: 1.1,
    Medium: 1.0,
    Low: 0.9,
    Lowest: 0.8,
  }
  multiplier *= priorityMultiplier[priority] || 1.0

  // Type complexity factor
  const typeMultiplier = {
    Bug: 0.8,
    Task: 0.9,
    Story: 1.2,
    Subtask: 0.6,
  }
  multiplier *= typeMultiplier[type] || 1.0

  // Description complexity (heuristic)
  const wordCount = (description || "").split(/\s+/).length
  if (wordCount > 100) multiplier *= 1.15
  if (/integration|migration|refactor|architecture/i.test(description)) multiplier *= 1.3
  if (/api|database|auth|payment/i.test(description)) multiplier *= 1.25

  const estimatedHours = baseEffort * multiplier
  const confidence = Math.min(95, 75 + (storyPoints > 0 ? 15 : 0)) // Higher confidence for estimated items

  return {
    estimatedHours: Math.round(estimatedHours),
    baseEffort,
    multiplier: Number.parseFloat(multiplier.toFixed(2)),
    confidence,
  }
}

// ===== QUALITY RISK MODEL =====
// Assesses risk of quality issues post-implementation
export function analyzeQualityRisk(workItem, sprint = null) {
  const { storyPoints = 1, priority, type, description = "", mlFeatures = {} } = workItem
  const { totalLinks = 0, totalComments = 0 } = mlFeatures

  let riskScore = 0
  const factors = []

  // High complexity tasks have more quality risk
  if (storyPoints >= 8) {
    riskScore += 25
    factors.push("High story point estimate (>=8)")
  }

  // Task type has lower quality risk
  if (type === "Task") {
    riskScore -= 10
  } else if (type === "Story") {
    riskScore += 15
    factors.push("Story type generally higher risk")
  }

  // Dependencies and discussions indicate complexity
  if (totalLinks > 3) {
    riskScore += 15
    factors.push("Multiple dependencies detected")
  }
  if (totalComments > 5) {
    riskScore += 10
    factors.push("High discussion activity")
  }

  // Keywords in description indicating risky areas
  if (/security|encryption|auth|payment|integration|api/i.test(description)) {
    riskScore += 25
    factors.push("Security/payment/integration keywords")
  }
  if (/refactor|migration|rewrite/i.test(description)) {
    riskScore += 20
    factors.push("Refactoring/migration detected")
  }

  // Priority factor
  if (priority === "Highest") riskScore += 5
  if (priority === "Lowest") riskScore -= 5

  riskScore = Math.max(0, Math.min(100, riskScore))

  let label = "Low"
  if (riskScore >= 70) label = "High"
  else if (riskScore >= 40) label = "Medium"

  return {
    probability: Number.parseFloat((riskScore / 100).toFixed(2)),
    label,
    score: riskScore,
    factors,
  }
}

// ===== SCHEDULE RISK MODEL =====
// Assesses risk of missing sprint deadlines
export function analyzeScheduleRisk(workItem, sprint = null) {
  const { storyPoints = 1, priority, type, description = "" } = workItem
  let riskScore = 0
  const factors = []

  if (!sprint) {
    return { probability: 0.2, label: "Low Risk", score: 20, factors: ["No sprint context"] }
  }

  const now = new Date()
  const sprintEnd = new Date(sprint.endDate)
  const daysRemaining = Math.max(1, Math.ceil((sprintEnd - now) / (1000 * 60 * 60 * 24)))

  // Check sprint capacity
  const { numberOfDevelopers = 5, hoursPerDayPerDeveloper = 6 } = sprint
  const teamCapacityHours = numberOfDevelopers * hoursPerDayPerDeveloper * daysRemaining
  const { estimatedHours } = analyzeEffort(workItem)

  // Load factor
  const loadPercentage = (estimatedHours / teamCapacityHours) * 100
  if (loadPercentage > 100) {
    riskScore += 40
    factors.push(`Effort exceeds capacity (${loadPercentage.toFixed(0)}%)`)
  } else if (loadPercentage > 75) {
    riskScore += 25
    factors.push(`High capacity utilization (${loadPercentage.toFixed(0)}%)`)
  } else if (loadPercentage > 50) {
    riskScore += 10
  }

  // Days remaining factor
  if (daysRemaining < 3) {
    riskScore += 30
    factors.push("Sprint ending soon")
  } else if (daysRemaining < 7) {
    riskScore += 15
  }

  // Priority elevates risk
  if (priority === "Highest") riskScore += 15
  if (priority === "Lowest") riskScore -= 10

  // Complexity in description
  if (/integration|migration|refactor/i.test(description)) {
    riskScore += 20
    factors.push("Complex task type")
  }

  riskScore = Math.max(0, Math.min(100, riskScore))

  let label = "No Risk"
  if (riskScore >= 70) label = "Critical Risk"
  else if (riskScore >= 50) label = "High Risk"
  else if (riskScore >= 30) label = "Medium Risk"
  else if (riskScore >= 15) label = "Low Risk"

  return {
    probability: Number.parseFloat((riskScore / 100).toFixed(2)),
    label,
    score: riskScore,
    factors,
    daysRemaining,
  }
}

// ===== PRODUCTIVITY MODEL =====
// Measures productivity impact from context switching and interruptions
export function analyzeProductivityImpact(newWorkItem, sprint = null) {
  const { storyPoints = 1 } = newWorkItem
  let productivityLossDays = 0
  const factors = []

  if (!sprint) {
    return { impactDays: 0, factors: [], severity: "None" }
  }

  // Get current sprint work items
  const totalItems = sprint.backlog_items?.length || 0
  const inProgressItems = sprint.backlog_items?.filter((i) => i.status === "In Progress").length || 0

  // Context switching cost: each item in progress creates cognitive load
  const contextSwitchCost = inProgressItems * 0.5 // Each context = 0.5 days lost
  if (inProgressItems > 2) {
    productivityLossDays += contextSwitchCost
    factors.push(`${inProgressItems} items in progress - context switching cost`)
  }

  // Interruption factor: new requirement in active sprint
  if (sprint.status === "active") {
    productivityLossDays += 1.0 // Base interruption cost
    factors.push("Sprint already active - interruption penalty")
  }

  // Size factor: large items disrupt more
  if (storyPoints >= 13) {
    productivityLossDays += 2.0
    factors.push("Large story points - significant disruption")
  } else if (storyPoints >= 8) {
    productivityLossDays += 1.2
    factors.push("Medium-large story points")
  } else if (storyPoints <= 2) {
    productivityLossDays -= 0.5 // Small items have less disruption
  }

  // Recovery time to regain full focus
  productivityLossDays += 0.5
  factors.push("Recovery time to regain focus")

  let severity = "None"
  if (productivityLossDays >= 3) severity = "Critical"
  else if (productivityLossDays >= 2) severity = "High"
  else if (productivityLossDays >= 1) severity = "Medium"
  else if (productivityLossDays > 0) severity = "Low"

  return {
    impactDays: Number.parseFloat(productivityLossDays.toFixed(1)),
    percentageImpact: Number.parseFloat((productivityLossDays * 20).toFixed(0)), // Each day ≈ 20%
    factors,
    severity,
  }
}

// ===== INTEGRATED IMPACT ANALYSIS =====
export async function performImpactAnalysis(workItem, sprint = null) {
  const effort = analyzeEffort(workItem, sprint)
  const qualityRisk = analyzeQualityRisk(workItem, sprint)
  const scheduleRisk = analyzeScheduleRisk(workItem, sprint)
  const productivity = analyzeProductivityImpact(workItem, sprint)

  return {
    workItem: {
      id: workItem._id,
      title: workItem.title,
      storyPoints: workItem.storyPoints,
    },
    effort,
    qualityRisk,
    scheduleRisk,
    productivity,
    overallRiskLevel: calculateOverallRisk(qualityRisk, scheduleRisk, productivity),
    analysisTimestamp: new Date(),
  }
}

function calculateOverallRisk(qualityRisk, scheduleRisk, productivity) {
  const weights = {
    quality: 0.35,
    schedule: 0.4,
    productivity: 0.25,
  }

  const qualityScore = qualityRisk.probability * 100
  const scheduleScore = scheduleRisk.probability * 100
  const productivityScore = Math.min(100, productivity.impactDays * 25) // Days → percentage

  const overallScore =
    qualityScore * weights.quality + scheduleScore * weights.schedule + productivityScore * weights.productivity

  let level = "Low"
  if (overallScore >= 70) level = "Critical"
  else if (overallScore >= 50) level = "High"
  else if (overallScore >= 30) level = "Medium"

  return {
    score: Number.parseFloat(overallScore.toFixed(1)),
    level,
  }
}
