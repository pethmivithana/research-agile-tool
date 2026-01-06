// backend/src/controllers/board.controller.js
import WorkItem from "../models/WorkItem.js"

const allowedByType = {
  Bug: ["Triaged", "Fixed"],
  Story: ["Design WIP", "Design Review", "Ready for Development"],
  Task: ["To Do", "In Progress", "In Review", "Done"],
  Subtask: ["To Do", "In Progress", "Done"],
}

export async function getBoard(req, res, next) {
  try {
    const { sprintId } = req.params
    const items = await WorkItem.find({ sprint: sprintId }).sort({ updatedAt: -1 })

    const grouped = { "To Do": [], "In Progress": [], "In Review": [], Done: [] }
    items.forEach((i) => {
      const status = ["To Do", "In Progress", "In Review", "Done"].includes(i.status) ? i.status : "To Do"
      grouped[status].push(i)
    })
    res.json(grouped)
  } catch (e) {
    next(e)
  }
}

export async function moveItem(req, res, next) {
  try {
    const { workItemId, toCol } = req.body
    const item = await WorkItem.findByIdAndUpdate(workItemId, { status: toCol }, { new: true, runValidators: true })

    if (!item) return res.status(404).json({ error: "Item not found" })

    res.json({ ok: true, item })
  } catch (e) {
    next(e)
  }
}
