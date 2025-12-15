// backend/src/routes/board.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getBoard, moveItem } from '../controllers/board.controller.js';
const r = Router();

r.get('/sprints/:sprintId/board', requireAuth, getBoard);
r.post('/board/move', requireAuth, moveItem);

export default r;
