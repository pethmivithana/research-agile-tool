// backend/src/app.js
import express from "express"
import cors from "cors"
import morgan from "morgan"
import { config } from "./config/env.js"
import authRoutes from "./routes/auth.routes.js"
import spacesRoutes from "./routes/spaces.routes.js"
import sprintsRoutes from "./routes/sprints.routes.js"
import backlogRoutes from "./routes/backlog.routes.js"
import boardRoutes from "./routes/board.routes.js"
import changesRoutes from "./routes/changes.routes.js"
import impactRoutes from "./routes/impact.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"

const app = express()
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }))
app.use(express.json())
app.use(morgan("dev"))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/spaces", spacesRoutes)
app.use("/api", sprintsRoutes)
app.use("/api", backlogRoutes)
app.use("/api", boardRoutes)
app.use("/api", changesRoutes)
app.use("/api/impact", impactRoutes)

// Error handler (must be last)
app.use(errorHandler)

export default app
