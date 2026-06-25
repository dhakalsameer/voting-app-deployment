import { db } from "../db.js";

export const getCandidates = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM candidates WHERE status = 'approved' OR status IS NULL ORDER BY position, created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getCandidates error:", error);
    return res.status(500).json({ error: "Failed to load candidates" });
  }
};
