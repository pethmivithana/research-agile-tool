// backend/src/routes/spaces.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createSpace, listSpaces, getSpace, addCollaborators
} from '../controllers/spaces.controller.js';

const r = Router();

r.post('/', requireAuth, createSpace);
r.get('/', requireAuth, listSpaces);
r.get('/:id', requireAuth, getSpace);
r.post('/:id/collaborators', requireAuth, addCollaborators);

export default r;
