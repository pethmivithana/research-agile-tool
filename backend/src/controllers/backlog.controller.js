// backend/src/controllers/backlog.controller.js
import WorkItem from '../models/WorkItem.js';

export async function createWorkItem(req, res, next) {
  try {
    const { spaceId } = req.params;
    const payload = req.body;
    const item = await WorkItem.create({
      ...payload,
      space: spaceId,
      createdBy: req.user.id
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
}

export async function listBacklog(req, res, next) {
  try {
    const { spaceId } = req.params;
    const items = await WorkItem.find({ space: spaceId, sprint: { $exists: false } }).sort('-createdAt');
    res.json(items);
  } catch (e) { next(e); }
}

export async function editWorkItem(req, res, next) {
  try {
    const { id } = req.params;
    const item = await WorkItem.findByIdAndUpdate(id, req.body, { new: true });
    res.json(item);
  } catch (e) { next(e); }
}

export async function deleteWorkItem(req, res, next) {
  try {
    const { id } = req.params;
    await WorkItem.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function addItemsToSprint(req, res, next) {
  try {
    const { sprintId } = req.params;
    const { itemIds = [] } = req.body;
    await WorkItem.updateMany({ _id: { $in: itemIds } }, { $set: { sprint: sprintId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
