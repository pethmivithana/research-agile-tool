// backend/src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import spacesRoutes from './routes/spaces.routes.js';
import sprintsRoutes from './routes/sprints.routes.js';
import backlogRoutes from './routes/backlog.routes.js';
import boardRoutes from './routes/board.routes.js';
import changesRoutes from './routes/changes.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import mlRoutes from './routes/ml.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api', sprintsRoutes);
app.use('/api', backlogRoutes);
app.use('/api', boardRoutes);
app.use('/api', changesRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/ml', mlRoutes);

app.use(errorHandler);
export default app;
