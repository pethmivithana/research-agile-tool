/**
 * Debug utility to validate ticket data before sending to ML service
 */

export function validateTicketData(data) {
  const errors = []
  const warnings = []

  // Required fields check
  const requiredFields = [
    "title",
    "description",
    "story_points",
    "priority",
    "issue_type",
    "total_links",
    "total_comments",
    "days_since_sprint_start",
    "days_remaining",
    "sprint_load_7d",
    "team_velocity_14d",
    "velocity_roll_5",
    "author_past_avg",
    "author_workload_14d",
  ]

  requiredFields.forEach((field) => {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`)
    }
  })

  // Type validation
  const numericFields = [
    "story_points",
    "total_links",
    "total_comments",
    "days_since_sprint_start",
    "days_remaining",
    "sprint_load_7d",
    "team_velocity_14d",
    "velocity_roll_5",
    "author_past_avg",
    "author_workload_14d",
  ]

  numericFields.forEach((field) => {
    if (field in data && typeof data[field] !== "number") {
      errors.push(`Field ${field} must be numeric, got ${typeof data[field]}`)
    }
  })

  // Value range validation
  if (data.story_points < 0.5 || data.story_points > 100) {
    warnings.push(`story_points ${data.story_points} is outside typical range (0.5-100)`)
  }

  if (data.days_remaining <= 0) {
    errors.push(`days_remaining must be positive, got ${data.days_remaining}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data,
  }
}

export function logValidationResult(result) {
  if (!result.isValid) {
    console.error("[Validation] ERRORS:", result.errors)
  }
  if (result.warnings.length > 0) {
    console.warn("[Validation] WARNINGS:", result.warnings)
  }
}
