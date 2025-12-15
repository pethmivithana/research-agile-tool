// backend/src/controllers/board.controller.js
import WorkItem from '../models/WorkItem.js';

const allowedByType = {
  Bug: ['Triaged','Fixed'],
  Story: ['Design WIP','Design Review','Ready for Development'],
  Task: ['To Do','In Progress','In Review','Done'],
  Subtask: ['To Do','In Progress','Done']
};

export async function getBoard(req, res, next) {
  try {
    const { sprintId } = req.params;
    const items = await WorkItem.find({ sprint: sprintId });
    const grouped = { 'To Do': [], 'In Progress': [], 'In Review': [], 'Done': [] };
    items.forEach(i => {
      const col = grouped[i.status] ? i.status : 'To Do';
      grouped[col].push(i);
    });
    res.json(grouped);
  } catch (e) { next(e); }
}

export async function moveItem(req, res, next) {
  try {
    const { workItemId, toCol } = req.body;
    const item = await WorkItem.findById(workItemId);
    const allowed = allowedByType[item.type];
    if (!allowed.includes(toCol)) return res.status(400).json({ error: 'Invalid status for type' });
    item.status = toCol;
    await item.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
}
