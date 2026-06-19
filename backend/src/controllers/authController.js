import bcrypt from "bcrypt";
import { ethers } from "ethers";
import { db } from "../db.js";
import { signToken } from "../config/env.js";

const WALLET_MESSAGE = "Gandaki University Election Wallet Verification";

const VALID_YEARS = ["1st", "2nd", "3rd", "4th"];
const VALID_GENDERS = ["male", "female", "other"];

export const verifyCode = async (req, res) => {
  try {
    const student_id = req.body.student_id || req.body.studentId;
    const code = req.body.code;

    if (!student_id || !code) {
      return res.status(400).json({ error: "student_id and code are required" });
    }

    const result = await db.query(
      "SELECT id FROM registration_codes WHERE student_id = $1 AND code = $2 AND used = false",
      [student_id, code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, error: "Invalid or already used registration code" });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error("verifyCode error:", error);
    return res.status(500).json({ error: "Code verification failed" });
  }
};

export const registerStudent = async (req, res) => {
  try {
    const { student_id, code, password, wallet, signature } = req.body;
    // name/year/gender are optional — admin may have pre-filled them.
    const name = req.body.name || null;
    const year = req.body.year || null;
    const gender = req.body.gender || null;

    if (!student_id || !code || !password) {
      return res.status(400).json({ error: "student_id, code and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // 1. Verify registration code exists and is unused
    const codeResult = await db.query(
      "SELECT id FROM registration_codes WHERE student_id = $1 AND code = $2 AND used = false",
      [student_id, code]
    );
    if (codeResult.rows.length === 0) {
      return res.status(403).json({ error: "Invalid or already used registration code" });
    }

    // 2. Verify wallet signature
    if (!wallet || !signature) {
      return res.status(400).json({ error: "wallet and signature are required" });
    }
    const recovered = ethers.verifyMessage(WALLET_MESSAGE, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // 3. Check if student already exists and is fully registered
    const existing = await db.query(
      "SELECT student_id, name, year, gender, registered FROM students WHERE student_id = $1",
      [student_id]
    );
    if (existing.rows.length > 0 && existing.rows[0].registered) {
      return res.status(409).json({ error: "Student ID already registered" });
    }

    // Merge incoming values with admin-preset values (admin wins)
    const mergedName = name || existing.rows[0]?.name || null;
    if (!mergedName) {
      return res.status(400).json({ error: "name is required (not set by admin)" });
    }
    const mergedYear = year || existing.rows[0]?.year || null;
    const mergedGender = gender || existing.rows[0]?.gender || null;

    const password_hash = await bcrypt.hash(password, 10);

    // 4. Upsert student record — preserve admin-set name/year/gender
    const result = await db.query(
      `INSERT INTO students (student_id, name, password_hash, year, gender, wallet_address, wallet_verified, registered)
       VALUES ($1, $2, $3, $4, $5, $6, true, true)
       ON CONFLICT (student_id) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         year = EXCLUDED.year,
         gender = EXCLUDED.gender,
         wallet_address = EXCLUDED.wallet_address,
         wallet_verified = true,
         registered = true,
         updated_at = NOW()
       RETURNING student_id, name, year, gender, image_cid,
                 wallet_address, wallet_verified, eligible_to_vote, registered`,
      [student_id, mergedName, password_hash, mergedYear, mergedGender, wallet]
    );

    // 5. Mark code as used
    await db.query(
      "UPDATE registration_codes SET used = true, used_at = NOW() WHERE student_id = $1 AND code = $2",
      [student_id, code]
    );

    const student = result.rows[0];
    const token = signToken({ student_id: student.student_id, name: student.name });

    return res.status(201).json({
      token,
      student: shape(student),
    });
  } catch (error) {
    console.error("registerStudent error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const student_id = req.body.student_id || req.body.studentId;
    const password = req.body.password;

    if (!student_id || !password) {
      return res.status(400).json({ error: "student_id and password are required" });
    }

    const result = await db.query(
      `SELECT student_id, name, password_hash, year, gender, image_cid,
              wallet_address, wallet_verified, eligible_to_vote, registered
       FROM students WHERE student_id = $1`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid student ID or password" });
    }

    const student = result.rows[0];

    if (!student.registered) {
      return res.status(403).json({ error: "Account not fully registered. Complete registration first." });
    }

    if (!student.password_hash) {
      return res.status(401).json({ error: "Account exists but no password set. Contact admin to migrate." });
    }

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid student ID or password" });
    }

    const token = signToken({ student_id: student.student_id, name: student.name });

    return res.json({
      token,
      student: shape(student),
    });
  } catch (error) {
    console.error("loginStudent error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { student_id } = req.user;

    const result = await db.query(
      `SELECT student_id, name, year, gender, image_cid,
              wallet_address, wallet_verified, eligible_to_vote, registered
       FROM students WHERE student_id = $1`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.json(shape(result.rows[0]));
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { student_id } = req.user;
    const { name } = req.body;

    // Students can only update their name, not year or gender
    const result = await db.query(
      `UPDATE students
       SET name = COALESCE($1, name),
           updated_at = NOW()
       WHERE student_id = $2
       RETURNING student_id, name, year, gender, image_cid,
                 wallet_address, wallet_verified, eligible_to_vote, registered`,
      [name || null, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    return res.json(shape(result.rows[0]));
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

/**
 * Admin: list all registered students, optionally filter by year.
 * Query: ?year=1st
 */
export const listStudents = async (req, res) => {
  try {
    const { year } = req.query;
    let sql = `SELECT student_id, name, year, gender, image_cid,
                      wallet_address, wallet_verified, eligible_to_vote, registered, created_at
               FROM students`;
    const params = [];

    if (year) {
      if (!VALID_YEARS.includes(year)) {
        return res.status(400).json({
          error: `year must be one of ${VALID_YEARS.join(", ")}`,
        });
      }
      sql += ` WHERE year = $1`;
      params.push(year);
    }

    sql += ` ORDER BY COALESCE(year, ''), student_id`;

    const result = await db.query(sql, params);
    return res.json({
      count: result.rows.length,
      students: result.rows.map(shape),
    });
  } catch (error) {
    console.error("listStudents error:", error);
    return res.status(500).json({ error: "Failed to list students" });
  }
};

/**
 * Admin: update a student's year/gender/name by student_id.
 * Body: { name?, year?, gender? }
 */
export const adminUpdateStudent = async (req, res) => {
  try {
    const student_id = req.params.id;
    const { name, year, gender } = req.body;

    if (year && !VALID_YEARS.includes(year)) {
      return res.status(400).json({
        error: `year must be one of ${VALID_YEARS.join(", ")}`,
      });
    }
    if (gender && !VALID_GENDERS.includes(gender)) {
      return res.status(400).json({
        error: `gender must be one of ${VALID_GENDERS.join(", ")}`,
      });
    }

    const result = await db.query(
      `UPDATE students
       SET name = COALESCE($1, name),
           year = COALESCE($2, year),
           gender = COALESCE($3, gender),
           updated_at = NOW()
       WHERE student_id = $4
       RETURNING student_id, name, year, gender, image_cid,
                 wallet_address, wallet_verified, eligible_to_vote, registered`,
      [name || null, year || null, gender || null, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    return res.json(shape(result.rows[0]));
  } catch (error) {
    console.error("adminUpdateStudent error:", error);
    return res.status(500).json({ error: "Failed to update student" });
  }
};

function shape(row) {
  return {
    student_id: row.student_id,
    name: row.name,
    year: row.year,
    gender: row.gender,
    image_cid: row.image_cid,
    wallet_address: row.wallet_address,
    walletLinked: Boolean(row.wallet_address),
    walletVerified: Boolean(row.wallet_verified),
    eligibleToVote: Boolean(row.eligible_to_vote),
    registered: Boolean(row.registered),
  };
}
