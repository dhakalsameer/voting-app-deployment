import { db } from "../db.js";

export const createCandidate = async (req, res) => {
  const { name, student_id, position, image_cid, blockchain_id } = req.body;

  const result = await db.query(
    `INSERT INTO candidates (name, student_id, position, image_cid, blockchain_id, vote_count)
     VALUES ($1,$2,$3,$4,$5, 0) RETURNING *`,
    [name, student_id, position, image_cid, blockchain_id]
  );

  res.json(result.rows[0]);
};

export const getCandidates = async (req, res) => {
  const result = await db.query("SELECT * FROM candidates");
  res.json(result.rows);
};
