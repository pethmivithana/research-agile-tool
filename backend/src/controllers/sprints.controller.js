// backend/src/controllers/sprints.controller.js
import Sprint from '../models/Sprint.js';
import { autoDatesFromDuration, completeSprint as completeSvc } from '../services/sprint.service.js';

export async function listSprints(req, res, next) {
  try {
    const { spaceId } = req.params;
    const sprints = await Sprint.find({ space: spaceId }).sort('order');
    res.json(sprints);
  } catch (e) { next(e); }
}

export async function createSprint(req, res, next) {
  try {
    const { spaceId } = req.params;
    const { name, goal, duration = '2w', order } = req.body;
    const dates = await autoDatesFromDuration(duration);
    const last = await Sprint.findOne({ space: spaceId }).sort('-order');
    const sprint = await Sprint.create({
      space: spaceId,
      name: name || `Sprint ${(last?.order || 0) + 1}`,
      goal,
      duration,
      startDate: dates.startDate,
      endDate: dates.endDate,
      status: 'planned',
      order: order ?? (last?.order || 0) + 1
    });
    res.status(201).json(sprint);
  } catch (e) { next(e); }
}

export async function editSprint(req, res, next) {
  try {
    const { sprintId } = req.params;
    const updates = req.body;
    const sprint = await Sprint.findByIdAndUpdate(sprintId, updates, { new: true });
    res.json(sprint);
  } catch (e) { next(e); }
}

export async function startSprint(req, res, next) {
  try {
    const { sprintId } = req.params;
    const sprint = await Sprint.findById(sprintId);
    sprint.status = 'active';
    if (!sprint.startDate) sprint.startDate = new Date();
    await sprint.save();
    res.json(sprint);
  } catch (e) { next(e); }
}

export async function completeSprintCtrl(req, res, next) {
  try {
    const { sprintId } = req.params;
    const result = await completeSvc(sprintId);
    res.json(result);
  } catch (e) { next(e); }
}
