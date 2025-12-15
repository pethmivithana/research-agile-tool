// backend/src/routes/ml.routes.js
import { Router } from 'express';
import { predictImpact, getRecommendations } from '../controllers/ml.controller.js';
import { requireAuth } from '../middleware/auth.js';
const r = Router();

r.post('/predict-impact', requireAuth, predictImpact);
r.post('/get-recommendations', requireAuth, getRecommendations);

export default r;
