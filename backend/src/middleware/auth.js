import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function requireStudentAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = match[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { student_id: decoded.student_id, name: decoded.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
