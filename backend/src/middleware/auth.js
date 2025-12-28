// backend/src/middleware/auth.js
import jwt from "jsonwebtoken"
import { config } from "../config/env.js"

/**
 * Middleware to protect routes with JWT authentication.
 * Expects Authorization header: "Bearer <token>"
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" })
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET)
    // Attach decoded payload to request for downstream use
    req.user = { id: payload.id, email: payload.email }
    next()
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" })
  }
}

export const protect = requireAuth
