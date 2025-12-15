// backend/src/controllers/spaces.controller.js
import Space from '../models/Space.js';

export async function createSpace(req, res, next) {
  try {
    const { name, collaborators = [], settings } = req.body;
    const space = await Space.create({
      name,
      owner: req.user.id,
      collaborators,
      settings
    });
    res.status(201).json(space);
  } catch (e) { next(e); }
}

export async function listSpaces(req, res, next) {
  try {
    const spaces = await Space.find({
      $or: [{ owner: req.user.id }, { collaborators: req.user.id }]
    }).sort('-createdAt');
    res.json(spaces);
  } catch (e) { next(e); }
}

export async function getSpace(req, res, next) {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).json({ error: 'Space not found' });
    res.json(space);
  } catch (e) { next(e); }
}

export async function addCollaborators(req, res, next) {
  try {
    const { id } = req.params;
    const { collaborators } = req.body; // array of userIds
    const space = await Space.findById(id);
    if (!space) return res.status(404).json({ error: 'Space not found' });
    if (String(space.owner) !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    space.collaborators = collaborators;
    await space.save();
    res.json(space);
  } catch (e) { next(e); }
}
