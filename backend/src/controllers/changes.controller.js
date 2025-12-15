// backend/src/controllers/changes.controller.js
import ChangeEvent from '../models/ChangeEvent.js';

export async function createChange(req, res, next) {
  try {
    const payload = req.body;
    const change = await ChangeEvent.create({
      ...payload,
      author: req.user.id,
      date: new Date()
    });
    res.status(201).json(change);
  } catch (e) { next(e); }
}

export async function getChange(req, res, next) {
  try {
    const change = await ChangeEvent.findById(req.params.id);
    if (!change) return res.status(404).json({ error: 'Change not found' });
    res.json(change);
  } catch (e) { next(e); }
}
