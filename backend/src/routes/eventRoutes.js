import express from "express";
import { getEvents } from "../services/eventStore.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(getEvents(limit));
  } catch (error) {
    res.status(500).json({ error: "Failed to load events" });
  }
});

export default router;
