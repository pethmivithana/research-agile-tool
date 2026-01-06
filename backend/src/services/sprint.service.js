// backend/src/services/sprint.service.js
import Sprint from "../models/Sprint.js"
import WorkItem from "../models/WorkItem.js"

export async function autoDatesFromDuration(duration, startDate = new Date()) {
  const start = new Date(startDate)
  const weeks = { "1w": 1, "2w": 2, "3w": 3, "4w": 4 }[duration] || 0
  if (!weeks) return { startDate: undefined, endDate: undefined }

  const end = new Date(start)
  end.setDate(end.getDate() + weeks * 7)
  return { startDate: start, endDate: end }
}

export async function completeSprint(sprintId) {
  const sprint = await Sprint.findById(sprintId)
  const items = await WorkItem.find({ sprint: sprintId })

  const doneSP = items.filter((i) => i.status === "Done").reduce((s, i) => s + (i.storyPoints || 0), 0)
  const committedSP = items.reduce((s, i) => s + (i.storyPoints || 0), 0)
  const remaining = items.filter((i) => i.status !== "Done")
  const spilloverSP = committedSP - doneSP

  let next = await Sprint.findOne({ space: sprint.space, order: sprint.order + 1 })
  if (!next) {
    next = await Sprint.create({
      space: sprint.space,
      name: `Sprint ${sprint.order + 1}`,
      duration: sprint.duration,
      status: "planned",
      order: sprint.order + 1,
    })
  }

  await Promise.all(
    remaining.map((i) => {
      i.sprint = next._id
      // Keep statuses as they are for non-task types, but reset Tasks/Subtasks if needed
      if (["Task", "Subtask"].includes(i.type)) {
        i.status = "To Do"
      }
      return i.save()
    }),
  )

  sprint.status = "completed"
  sprint.metrics = { committedSP, completedSP: doneSP, spilloverSP, velocity: doneSP }
  await sprint.save()
  return { sprint, next }
}
