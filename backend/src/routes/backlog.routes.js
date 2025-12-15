// backend/src/routes/backlog.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createWorkItem, listBacklog, editWorkItem, deleteWorkItem, addItemsToSprint
} from '../controllers/backlog.controller.js';

const r = Router();

r.post('/spaces/:spaceId/backlog', requireAuth, createWorkItem);
r.get('/spaces/:spaceId/backlog', requireAuth, listBacklog);
r.patch('/work-items/:id', requireAuth, editWorkItem);
r.delete('/work-items/:id', requireAuth, deleteWorkItem);
r.post('/sprints/:sprintId/add-items', requireAuth, addItemsToSprint);

export default r;
