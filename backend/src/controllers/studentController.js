import { db } from "../db.js";

export const createStudent = async (req, res) => {
  const { student_id, name, wallet_address, image_cid } = req.body;

  const result = await db.query(
    `INSERT INTO students (student_id, name, wallet_address, image_cid)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [student_id, name, wallet_address, image_cid]
  );

  res.json(result.rows[0]);
};

export const getStudents = async (req, res) => {
  const result = await db.query("SELECT * FROM students");
  res.json(result.rows);
};
