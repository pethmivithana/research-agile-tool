// backend/src/services/sprint.service.js
import Sprint from "../models/Sprint.js"
import WorkItem from "../models/WorkItem.js"

export async function autoDatesFromDuration(duration, startDate = new Date()) {
  const start = new Date(startDate)
  const durationMap = {
    "1w": 7,
    "2w": 14,
    "3w": 21,
    "4w": 28,
  }
  const days = durationMap[duration] || 14

  const end = new Date(start)
  end.setDate(end.getDate() + days)

  return {
    startDate: start,
    endDate: end,
    durationDays: days,
  }
}

export async function completeSprint(sprintId) {
  const sprint = await Sprint.findById(sprintId)
  
  if (!sprint) {
    throw new Error("Sprint not found")
  }

  if (sprint.status !== "active") {
    throw new Error("Only active sprints can be completed")
  }

  const items = await WorkItem.find({ sprint: sprintId })

  // Calculate metrics
  const doneSP = items.filter((i) => i.status === "Done").reduce((s, i) => s + (i.storyPoints || 0), 0)
  const committedSP = sprint.metrics?.committedSP || items.reduce((s, i) => s + (i.storyPoints || 0), 0)
  const remaining = items.filter((i) => i.status !== "Done")
  const spilloverSP = committedSP - doneSP

  // Find or create next sprint
  let next = await Sprint.findOne({ space: sprint.space, order: sprint.order + 1 })
  if (!next) {
    const dates = await autoDatesFromDuration(sprint.duration)
    next = await Sprint.create({
      space: sprint.space,
      name: `Sprint ${sprint.order + 1}`,
      duration: sprint.duration,
      status: "planned",
      order: sprint.order + 1,
      startDate: dates.startDate,
      endDate: dates.endDate,
      durationDays: dates.durationDays,
      numberOfDevelopers: sprint.numberOfDevelopers,
      hoursPerDayPerDeveloper: sprint.hoursPerDayPerDeveloper,
      teamCapacityHours: sprint.teamCapacityHours,
    })
  }

  // Move incomplete items to next sprint
  await Promise.all(
    remaining.map((i) => {
      i.sprint = next._id
      // Reset status for Task/Subtask types
      if (["Task", "Subtask"].includes(i.type)) {
        i.status = "To Do"
      }
      return i.save()
    }),
  )

  // Update completed sprint metrics
  sprint.status = "completed"
  sprint.metrics = {
    ...sprint.metrics,
    committedSP,
    completedSP: doneSP,
    spilloverSP,
    velocity: doneSP,
  }
  await sprint.save()

  // Update next sprint metrics with previous velocity
  next.metrics = {
    ...next.metrics,
    prevSprintVelocity: doneSP,
  }
  await next.save()

  return {
    completedSprint: sprint,
    nextSprint: next,
    movedItems: remaining.length,
    metrics: {
      committed: committedSP,
      completed: doneSP,
      spillover: spilloverSP,
      velocity: doneSP,
    },
  }
}