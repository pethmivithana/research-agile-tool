// backend/src/server.js
import 'dotenv/config';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import app from './app.js';

connectDB().then(() => {
  app.listen(config.PORT, () => console.log(`API on ${config.PORT}`));
});
