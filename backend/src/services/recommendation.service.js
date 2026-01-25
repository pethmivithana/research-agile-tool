/**
 * PURE RULE-BASED RECOMMENDATION ENGINE
 * ======================================
 * This service uses ONLY rules and heuristics - NO ML models.
 * It takes ML predictions as input and generates actionable recommendations.
 * 
 * Rules Implemented:
 * 1. Zero-Sum Rule: Points in = Points out
 * 2. Context-Switching Tax: Cost of interrupting team
 * 3. WIP Safety Rule: Don't pause "In Progress" unless Critical
 * 4. Capacity Constraints: Respect sprint limits
 */

/**
 * Main function: Generate recommendations based on ML analysis + sprint context
 */
export function generateRecommendation(analysis, newTicket, activeSprint, sprintItems = []) {
  console.log("\n" + "=".repeat(70))
  console.log("💡 GENERATING RULE-BASED RECOMMENDATIONS")
  console.log("=".repeat(70))

  // Extract key metrics
  const newPoints = newTicket.storyPoints || 1
  const priority = newTicket.priority || "Medium"
  const isCritical = priority === "Highest"

  // Calculate sprint state
  const currentLoad = sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0)
  const capacity = activeSprint.metrics?.committedSP || 30
  const remainingCapacity = capacity - currentLoad

  const now = new Date()
  const daysRemaining = Math.max(0.5, Math.ceil((new Date(activeSprint.endDate) - now) / (1000 * 60 * 60 * 24)))

  // Extract ML predictions
  const scheduleRiskHigh = analysis.scheduleRisk.probability > 0.5
  const productivityImpactHigh = analysis.productivity.impactDays >= 2.0
  const qualityRiskHigh = analysis.qualityRisk.probability > 0.5

  console.log(`\n📊 SPRINT STATE:`)
  console.log(`  Current Load: ${currentLoad} SP / ${capacity} SP`)
  console.log(`  Remaining Capacity: ${remainingCapacity} SP`)
  console.log(`  Days Remaining: ${daysRemaining}`)

  console.log(`\n🎯 NEW REQUIREMENT:`)
  console.log(`  Title: ${newTicket.title}`)
  console.log(`  Story Points: ${newPoints} SP`)
  console.log(`  Priority: ${priority}`)

  console.log(`\n🤖 ML RISK ASSESSMENT:`)
  console.log(`  Schedule Risk: ${scheduleRiskHigh ? 'HIGH' : 'LOW'} (${(analysis.scheduleRisk.probability * 100).toFixed(0)}%)`)
  console.log(`  Productivity Impact: ${productivityImpactHigh ? 'HIGH' : 'LOW'} (${analysis.productivity.impactDays} days)`)
  console.log(`  Quality Risk: ${qualityRiskHigh ? 'HIGH' : 'LOW'} (${(analysis.qualityRisk.probability * 100).toFixed(0)}%)`)

  // ====================================
  // RULE-BASED DECISION TREE
  // ====================================

  const options = []

  // --- RULE 1: DEFER (Always available as safest option) ---
  console.log("\n🔍 RULE 1: Evaluating DEFER option...")
  options.push({
    id: "defer_to_next_sprint",
    type: "defer_to_next_sprint",
    title: "Defer to Next Sprint",
    severity: "low",
    description: "Add this requirement to the backlog for next sprint planning.",
    rationale: "Protects current sprint from mid-cycle disruption. Allows proper capacity planning.",
    action_steps: [
      "Add ticket to product backlog with High priority",
      "Include in next sprint planning session",
      "Notify stakeholders of timeline adjustment",
      "Document deferral reason for retrospective"
    ],
    sub_tasks: [],
    affected_items: [],
  })

  // --- RULE 2: ACCEPT (If capacity available OR critical priority) ---
  console.log("\n🔍 RULE 2: Evaluating ACCEPT option...")
  if (remainingCapacity >= newPoints) {
    console.log(`  ✅ Capacity available (${remainingCapacity} SP >= ${newPoints} SP)`)
    
    const severity = scheduleRiskHigh || qualityRiskHigh ? "medium" : "low"
    
    options.push({
      id: "accept_with_mitigation",
      type: "accept_with_mitigation",
      title: "Add to Current Sprint (Capacity Available)",
      severity,
      description: `Add the requirement to the active sprint using available capacity (${remainingCapacity} SP available).`,
      rationale: `Sprint has sufficient capacity. ${scheduleRiskHigh ? 'High schedule risk requires close monitoring.' : ''} ${qualityRiskHigh ? 'High quality risk suggests adding code review checkpoints.' : ''}`.trim(),
      action_steps: [
        "Add ticket to active sprint",
        "Assign to developer immediately",
        scheduleRiskHigh ? "Daily progress check-ins due to schedule risk" : "",
        qualityRiskHigh ? "Add mandatory peer review before merge" : "",
        productivityImpactHigh ? "Schedule team sync to minimize context switching" : "",
        "Update sprint burndown chart"
      ].filter(Boolean),
      sub_tasks: [],
      affected_items: [],
    })
  } else if (isCritical) {
    console.log(`  ⚠️ No capacity but CRITICAL priority - suggesting accept with override`)
    
    options.push({
      id: "accept_with_mitigation",
      type: "accept_with_mitigation",
      title: "Add to Sprint (Critical Override)",
      severity: "high",
      description: "Override capacity constraints due to critical priority. Accept risk of sprint overload.",
      rationale: `Critical priority justifies mid-sprint addition. Sprint will exceed capacity by ${newPoints - remainingCapacity} SP.`,
      action_steps: [
        "Add ticket to sprint as highest priority",
        "Notify team of capacity increase in standup",
        "Consider extending sprint deadline by 1-2 days",
        "Prepare descoping plan for lower priority items if needed",
        "Increase daily sync frequency",
        productivityImpactHigh ? `Expect ${analysis.productivity.impactDays} days productivity loss` : ""
      ].filter(Boolean),
      sub_tasks: [],
      affected_items: [],
    })
  } else {
    console.log(`  ❌ No capacity (${remainingCapacity} SP < ${newPoints} SP) and not critical`)
  }

  // --- RULE 3: SWAP (Zero-Sum: Remove lower priority to make space) ---
  console.log("\n🔍 RULE 3: Evaluating SWAP option...")
  if (remainingCapacity < newPoints) {
    const swapCandidates = findSwapCandidates(sprintItems, newPoints, priority)
    
    if (swapCandidates.length > 0) {
      const candidate = swapCandidates[0]
      console.log(`  ✅ Found swap candidate: "${candidate.title}" (${candidate.storyPoints} SP, ${candidate.priority})`)
      
      // Calculate context switching cost
      const switchingCost = calculateContextSwitchingCost(candidate, productivityImpactHigh)
      
      options.push({
        id: "swap_priority",
        type: "swap_priority",
        title: `Swap with "${candidate.title}"`,
        severity: "medium",
        description: `Remove "${candidate.title}" (${candidate.storyPoints} SP, ${candidate.priority} priority) and add new requirement.`,
        rationale: `Zero-Sum Rule: New requirement has higher priority. Swap maintains capacity balance. Context switching cost: ${switchingCost} hours.`,
        action_steps: [
          `Move "${candidate.title}" to product backlog`,
          "Add new requirement to active sprint",
          "Notify affected developer of priority change",
          "Update sprint burndown to reflect swap",
          switchingCost > 4 ? "Schedule team meeting to discuss impact" : "Brief team in standup"
        ],
        sub_tasks: [],
        affected_items: [
          {
            id: candidate._id?.toString(),
            title: candidate.title,
            story_points: candidate.storyPoints,
            action: "remove_from_sprint",
          },
        ],
      })
    } else {
      console.log(`  ❌ No suitable swap candidates found`)
    }
  }

  // --- RULE 4: SPLIT (For large stories) ---
  console.log("\n🔍 RULE 4: Evaluating SPLIT option...")
  if (newPoints >= 8) {
    console.log(`  ✅ Large story (${newPoints} SP >= 8 SP) - splitting recommended`)
    
    // Calculate optimal split
    const part1Points = Math.min(remainingCapacity, Math.ceil(newPoints * 0.4)) // 40% for sprint
    const part2Points = newPoints - part1Points

    if (part1Points >= 2) {
      options.push({
        id: "split_story",
        type: "split_story",
        title: "Split into Smaller Stories",
        severity: "medium",
        description: `Split ${newPoints} SP requirement into Part 1 (${part1Points} SP, current sprint) and Part 2 (${part2Points} SP, next sprint).`,
        rationale: `Large stories increase risk. Splitting reduces schedule and quality risk while delivering incremental value. ${qualityRiskHigh ? 'Quality risk is high - smaller chunks allow better testing.' : ''}`,
        action_steps: [
          `Create Part 1: Core/MVP functionality (${part1Points} SP)`,
          `Create Part 2: Extended features (${part2Points} SP)`,
          "Add Part 1 to current sprint",
          "Add Part 2 to backlog for next sprint",
          "Define clear acceptance criteria for Part 1",
          "Document dependencies between parts"
        ],
        sub_tasks: [
          {
            title: `${newTicket.title} - Part 1 (MVP)`,
            story_points: part1Points,
            description: "Core functionality for current sprint"
          },
          {
            title: `${newTicket.title} - Part 2 (Extended)`,
            story_points: part2Points,
            description: "Additional features for next sprint"
          },
        ],
        affected_items: [],
      })
    } else {
      console.log(`  ❌ Part 1 would be too small (${part1Points} SP) - split not viable`)
    }
  } else {
    console.log(`  ❌ Story size OK (${newPoints} SP < 8 SP) - split not needed`)
  }

  // ====================================
  // SELECT PRIMARY RECOMMENDATION
  // ====================================
  console.log("\n🎯 SELECTING PRIMARY RECOMMENDATION...")
  
  let primaryIndex = 0 // Default to DEFER
  
  // Decision logic based on ML predictions and rules
  if (isCritical && scheduleRiskHigh) {
    // Critical + High Risk → Accept with mitigation
    primaryIndex = options.findIndex(o => o.type === "accept_with_mitigation")
    if (primaryIndex === -1) primaryIndex = 0
    console.log("  → Selected: ACCEPT (Critical priority + High schedule risk)")
  } 
  else if (productivityImpactHigh && daysRemaining < 5) {
    // High productivity impact + little time → Defer
    primaryIndex = 0
    console.log("  → Selected: DEFER (High productivity impact + Low time remaining)")
  }
  else if (remainingCapacity >= newPoints && !scheduleRiskHigh && !qualityRiskHigh) {
    // Capacity available + Low risks → Accept
    primaryIndex = options.findIndex(o => o.type === "accept_with_mitigation")
    console.log("  → Selected: ACCEPT (Capacity available + Low risks)")
  }
  else if (newPoints >= 8 && options.find(o => o.type === "split_story")) {
    // Large story → Split
    primaryIndex = options.findIndex(o => o.type === "split_story")
    console.log("  → Selected: SPLIT (Large story)")
  }
  else if (options.find(o => o.type === "swap_priority")) {
    // Can swap → Swap
    primaryIndex = options.findIndex(o => o.type === "swap_priority")
    console.log("  → Selected: SWAP (Suitable candidate found)")
  }
  else {
    // Default → Defer
    primaryIndex = 0
    console.log("  → Selected: DEFER (Default safe option)")
  }

  const primary = options[primaryIndex]
  const alternatives = options.filter((_, i) => i !== primaryIndex)

  console.log(`\n✅ PRIMARY: ${primary.title}`)
  console.log(`   Severity: ${primary.severity}`)
  console.log(`   Alternatives: ${alternatives.length}`)
  console.log("=".repeat(70) + "\n")

  return {
    primary,
    alternatives,
    context: {
      current_load: currentLoad,
      capacity,
      remaining_capacity: remainingCapacity,
      days_remaining: daysRemaining,
      ml_risk_factors: {
        schedule_risk_high: scheduleRiskHigh,
        productivity_impact_high: productivityImpactHigh,
        quality_risk_high: qualityRiskHigh,
      },
    },
  }
}

/**
 * Find suitable items to swap (WIP Safety Rule)
 */
function findSwapCandidates(sprintItems, neededPoints, newPriority) {
  const priorityRank = { Highest: 5, High: 4, Medium: 3, Low: 2, Lowest: 1 }
  const newRank = priorityRank[newPriority] || 3

  const candidates = sprintItems
    .filter(item => {
      // Must be lower priority
      const itemRank = priorityRank[item.priority] || 3
      if (itemRank >= newRank) return false

      // Must not be Done
      if (item.status === "Done") return false

      // Must have similar or larger points
      if ((item.storyPoints || 0) < neededPoints - 3) return false

      return true
    })
    .map(item => {
      // Scoring: prefer "To Do" over "In Progress" (WIP Safety)
      const statusPenalty = item.status === "To Do" ? 0 : 100
      const pointsDiff = Math.abs((item.storyPoints || 0) - neededPoints)
      
      return {
        ...item,
        swapScore: statusPenalty + pointsDiff
      }
    })
    .sort((a, b) => a.swapScore - b.swapScore)

  return candidates
}

/**
 * Calculate context switching cost
 */
function calculateContextSwitchingCost(item, isHighProductivityImpact) {
  let cost = 2 // Base cost in hours

  // Status impact (WIP Safety Rule)
  if (item.status === "In Progress") {
    cost += 4 // High cost to interrupt active work
  } else if (item.status === "In Review") {
    cost += 2 // Medium cost
  }

  // Size impact
  if ((item.storyPoints || 0) >= 8) {
    cost += 3
  }

  // Productivity impact from ML
  if (isHighProductivityImpact) {
    cost += 4
  }

  return cost
}