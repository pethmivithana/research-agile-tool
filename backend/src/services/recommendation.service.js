/**
 * Rule-Based Recommendation Engine
 * Implements: Zero-Sum Rule, Context-Switching Tax, WIP Safety Rule
 */

// ===== CONSTRAINT CHECKING =====

/**
 * Zero-Sum Rule: Points in == Points out
 * Cannot add to sprint without removing equal points
 */
function validateZeroSumRule(newItemPoints, sprintItems, targetRemovalSP = 0) {
  return {
    isValid: true,
    pointsIn: newItemPoints,
    pointsOut: targetRemovalSP,
    balanced: newItemPoints <= targetRemovalSP,
    message:
      newItemPoints <= targetRemovalSP ? "Zero-Sum satisfied" : `Deficit: ${newItemPoints - targetRemovalSP} points`,
  }
}

/**
 * Context Switching Tax: Cost of interrupting team
 * Productivity Loss = Productivity Impact + Task Switching Cost
 */
function calculateContextSwitchingTax(workItemPoints, sprintStatus, inProgressCount, productivityModel) {
  let baseCost = 0.5 // hours

  // Status factor
  if (sprintStatus === "active") baseCost += 2.0

  // WIP complexity
  baseCost += inProgressCount * 0.75

  // Item size factor
  if (workItemPoints >= 13) baseCost *= 1.5
  else if (workItemPoints >= 8) baseCost *= 1.2

  const totalCost = baseCost + (productivityModel?.impactDays || 0)

  return {
    baseCost,
    productivityImpact: productivityModel?.impactDays || 0,
    totalDaysLost: Number.parseFloat(totalCost.toFixed(1)),
    hoursPer8HourDay: Math.round(totalCost * 8),
  }
}

/**
 * WIP Safety Rule: Do not pause "In Progress" tasks unless Critical
 * Priority: To Do > In Review > In Progress (unless Critical Blocker)
 */
function findOptimalSwapCandidate(sprintItems, isCritical = false) {
  const sortedByStatus = {
    "To Do": [],
    "In Review": [],
    "In Progress": [],
  }

  sprintItems.forEach((item) => {
    if (sortedByStatus[item.status]) {
      sortedByStatus[item.status].push(item)
    }
  })

  // Sort each status by story points (ascending)
  Object.keys(sortedByStatus).forEach((status) => {
    sortedByStatus[status].sort((a, b) => (a.story_points || 0) - (b.story_points || 0))
  })

  // Priority order for removal
  if (sortedByStatus["To Do"].length > 0) {
    return {
      item: sortedByStatus["To Do"][0],
      reason: "To Do items are lowest context-switch cost",
    }
  }

  if (sortedByStatus["In Review"].length > 0) {
    return {
      item: sortedByStatus["In Review"][0],
      reason: "In Review items are easier to defer than In Progress",
    }
  }

  if (isCritical && sortedByStatus["In Progress"].length > 0) {
    return {
      item: sortedByStatus["In Progress"][0],
      reason: "Only considering In Progress for critical requirements",
    }
  }

  return { item: null, reason: "No items available for swap" }
}

// ===== RECOMMENDATION GENERATION =====

/**
 * Core Assessment Function: Decides action for sprint interruption
 * Returns: SWAP, DEFER, SPLIT, or CRITICAL ALERT
 */
export function assessSprintInterruption(newTicket, activeSprint, allSprintItems = []) {
  const { storyPoints: newPoints = 1, priority = "Medium", description = "" } = newTicket
  const isCritical = priority === "Highest"

  // Build sprint items list if not provided
  const sprintItems = allSprintItems.map((item) => ({
    id: item._id?.toString(),
    title: item.title,
    story_points: item.storyPoints || 0,
    status: item.status,
    priority: item.priority,
  }))

  const currentSP = sprintItems.reduce((sum, item) => sum + (item.story_points || 0), 0)
  const sprintCapacity = activeSprint.metrics?.committedSP || 30
  const remainingCapacity = sprintCapacity - currentSP

  const constraintsChecked = []

  // DECISION TREE

  // 1. Check if item fits without changes
  if (newPoints <= remainingCapacity) {
    constraintsChecked.push("Capacity available")
    return {
      action: "ACCEPT",
      reasoning: `New requirement (${newPoints} SP) fits within remaining capacity (${remainingCapacity} SP)`,
      constraints_checked: constraintsChecked,
      recommendation: `Add directly to sprint. No rebalancing needed.`,
    }
  }

  // 2. If new item is small and critical, try to fit it
  if (newPoints <= 5 && isCritical) {
    const candidate = findOptimalSwapCandidate(sprintItems, true)
    if (candidate.item && candidate.item.story_points <= newPoints) {
      constraintsChecked.push("Zero-Sum", "WIP-Safety")
      return {
        action: "SWAP",
        target_to_remove: candidate.item.id,
        removed_item: candidate.item.title,
        removed_points: candidate.item.story_points,
        reasoning: `Critical requirement (${newPoints} SP) takes priority. Swap with lowest-priority ${candidate.item.status} item (${candidate.item.story_points} SP). ${candidate.reason}`,
        constraints_checked: constraintsChecked,
        recommendation: "SWAP_PRIORITY",
        affected_items: [candidate.item],
      }
    }
  }

  // 3. Consider SPLIT if item is large
  if (newPoints >= 8) {
    constraintsChecked.push("Split-Feasibility")
    const splitableSize = Math.ceil(remainingCapacity / 2)
    if (splitableSize > 0) {
      return {
        action: "SPLIT",
        reasoning: `Item is large (${newPoints} SP). Can split into smaller parts: (${splitableSize} SP now, ${newPoints - splitableSize} SP later)`,
        constraints_checked: constraintsChecked,
        recommendation: "SPLIT_STORY",
        suggested_split: {
          part_1_points: splitableSize,
          part_2_points: newPoints - splitableSize,
          note: `Add ${splitableSize} SP to current sprint, defer ${newPoints - splitableSize} SP to next`,
        },
      }
    }
  }

  // 4. If Critical Blocker (Highest priority + urgent), CRITICAL ALERT
  if (isCritical && /blocker|critical|urgent|production|down/i.test(description)) {
    constraintsChecked.push("Critical-Path-Detection")
    return {
      action: "CRITICAL_ALERT",
      reasoning: `CRITICAL BLOCKER DETECTED: This is a production issue or blocker. Immediate escalation required.`,
      constraints_checked: constraintsChecked,
      recommendation: "CRITICAL_ALERT",
      escalation_note: "Manual review required. Recommend team sync to assess impact.",
      suggested_actions: [
        'Pause lowest-priority item in "In Progress"',
        "Add critical blocker to sprint immediately",
        "Notify team of context switch",
      ],
    }
  }

  // 5. Default: DEFER
  constraintsChecked.push("Capacity-Unavailable", "Priority-Check")
  return {
    action: "DEFER",
    reasoning: `Insufficient capacity (need ${newPoints} SP, available ${remainingCapacity} SP). Item is not critical enough to interrupt sprint.`,
    constraints_checked: constraintsChecked,
    recommendation: "DEFER_TO_NEXT_SPRINT",
    alternative_actions: [
      "Add to backlog for next sprint planning",
      "Monitor for critical changes",
      "Consider splitting into smaller parts",
    ],
  }
}

/**
 * Generate full recommendation with all options
 */
export function generateRecommendation(analysis, newTicket, activeSprint, sprintItems = []) {
  const assessment = assessSprintInterruption(newTicket, activeSprint, sprintItems)

  // Build recommendation options
  const options = buildRecommendationOptions(newTicket, activeSprint, sprintItems, assessment)

  return {
    primary_recommendation: {
      title: assessment.action,
      description: assessment.reasoning,
      confidence: calculateConfidence(assessment),
      recommendation_type: assessment.recommendation,
    },
    assessment: assessment,
    options: options,
    analysis_summary: {
      new_item_points: newTicket.storyPoints || 1,
      new_item_priority: newTicket.priority,
      sprint_status: activeSprint.status,
      current_load: sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0),
      remaining_capacity:
        (activeSprint.metrics?.committedSP || 30) - sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0),
    },
  }
}

function buildRecommendationOptions(newTicket, activeSprint, sprintItems, assessment) {
  const options = []

  const { storyPoints: newPoints = 1 } = newTicket
  const sprintCapacity = activeSprint.metrics?.committedSP || 30
  const currentLoad = sprintItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0)

  // Option 1: DEFER
  options.push({
    type: "defer_to_next_sprint",
    title: "Defer to Next Sprint",
    description: "Add to backlog for next sprint planning",
    impact: {
      sprint_impact: "None - Sprint remains unchanged",
      team_impact: "No context switching",
      schedule_impact: "Delayed by ~2 weeks",
    },
    recommended_when: "Item is not critical and sprint is at capacity",
  })

  // Option 2: SWAP (if viable)
  const candidate = findOptimalSwapCandidate(sprintItems, false)
  if (candidate.item && (candidate.item.story_points || 0) <= newPoints) {
    options.push({
      type: "swap_priority",
      title: `Swap with "${candidate.item.title}" (${candidate.item.story_points} SP)`,
      description: `Remove ${candidate.item.title} from sprint, add new requirement`,
      impact: {
        sprint_impact: "Load stays ~same",
        team_impact: "Context switching cost: ~1 day",
        schedule_impact: `Deferred item: ${candidate.item.story_points} SP`,
      },
      affected_items: [candidate.item],
      recommended_when: "New item is higher priority and similar size",
    })
  }

  // Option 3: SPLIT
  if (newPoints > 5) {
    const splitPart1 = Math.ceil(newPoints / 2)
    const splitPart2 = newPoints - splitPart1

    options.push({
      type: "split_story",
      title: `Split Story (${splitPart1} SP + ${splitPart2} SP)`,
      description: `Add smaller part (${splitPart1} SP) to current sprint, defer rest to next sprint`,
      impact: {
        sprint_impact: `Add ~${splitPart1} SP to current sprint`,
        team_impact: "Reduced context switching due to smaller first part",
        schedule_impact: "Part 1 in this sprint, Part 2 in next sprint",
      },
      sub_tasks: [
        {
          title: `${newTicket.title} - Part 1`,
          story_points: splitPart1,
        },
        {
          title: `${newTicket.title} - Part 2`,
          story_points: splitPart2,
        },
      ],
      recommended_when: "Item is large and can be logically divided",
    })
  }

  // Option 4: ACCEPT WITH MITIGATION
  if (newPoints <= sprintCapacity * 0.2) {
    // If item is <= 20% of capacity
    options.push({
      type: "accept_with_mitigation",
      title: "Accept with Mitigation",
      description: "Add to sprint and implement risk mitigation strategies",
      impact: {
        sprint_impact: `Add ${newPoints} SP (may exceed capacity by ${currentLoad + newPoints - sprintCapacity} SP)`,
        team_impact: "Significant context switching - recommend daily syncs",
        schedule_impact: "Risk of sprint goal compromise",
      },
      mitigations: [
        "Daily stand-up focus on new item",
        "Pair programming on new requirement",
        "Reduce scope of other items if needed",
        "Have backlog ready for descoping",
      ],
      recommended_when: "Item is critical but small, team can handle overload",
    })
  }

  return options
}

function calculateConfidence(assessment) {
  const actionConfidenceMap = {
    ACCEPT: 95,
    DEFER: 90,
    SWAP: 80,
    SPLIT: 75,
    CRITICAL_ALERT: 100,
  }

  return actionConfidenceMap[assessment.action] || 70
}
