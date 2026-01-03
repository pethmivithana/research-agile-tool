// backend/src/controllers/changes.controller.js
import ChangeEvent from "../models/ChangeEvent.js"

/**
 * Create a change event (for audit tracking only)
 * ML analysis is now handled separately via impact.controller.js
 */
export async function createChange(req, res, next) {
  try {
    const payload = req.body
    const spaceId = req.params.spaceId || payload.space

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" })
    }

    // Create simple change event for tracking
    const change = await ChangeEvent.create({
      space: spaceId,
      workItem: payload.workItem,
      type: payload.type || "Update",
      fieldsChanged: payload.fieldsChanged || [],
      diffs: payload.diffs || [],
      author: req.user.id,
      date: new Date(),
    })

    res.status(201).json(change)
  } catch (e) {
    next(e)
  }
}

/**
 * Get a specific change event
 */
export async function getChange(req, res, next) {
  try {
    const change = await ChangeEvent.findById(req.params.id)
      .populate('workItem', 'title type priority')
      .populate('author', 'username email')

    if (!change) {
      return res.status(404).json({ error: "Change not found" })
    }

    res.json(change)
  } catch (e) {
    next(e)
  }
}

/**
 * List change events for a space (for history/audit)
 */
export async function listChanges(req, res, next) {
  try {
    const { spaceId } = req.params
    const limit = parseInt(req.query.limit) || 50
    const skip = parseInt(req.query.skip) || 0

    const changes = await ChangeEvent.find({ space: spaceId })
      .populate('workItem', 'title type')
      .populate('author', 'username')
      .sort('-date')
      .limit(limit)
      .skip(skip)

    const total = await ChangeEvent.countDocuments({ space: spaceId })

    res.json({
      changes,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    })
  } catch (e) {
    next(e)
  }
}