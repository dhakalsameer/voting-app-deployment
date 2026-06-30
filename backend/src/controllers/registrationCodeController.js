import crypto from "crypto";
import { db } from "../db.js";

/**
 * Generate a human-friendly code: XXXX-XXXX-XXXX (12 uppercase alphanumeric chars).
 */
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit 0, O, I, 1 for readability
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

const VALID_YEARS = ["1st", "2nd", "3rd", "4th"];
const VALID_GENDERS = ["male", "female", "other"];

/**
 * POST /api/admin/generate-codes
 * Body: { students: [{student_id, name?, year?, gender?}] }
 *
 * Bulk generates one unique registration code per student ID.
 * If name/year/gender are provided, the student record is created/updated
 * with those details (registered stays false until the student self-registers).
 * Returns a list of { student_id, code } pairs.
 * If a code already exists for a student_id, it is skipped (idempotent).
 */
export const generateCodes = async (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "students must be a non-empty array" });
    }

    const seen = new Set();
    const normalized = [];
    for (const s of students) {
      const id = String(s.student_id || "").trim().toUpperCase();
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const year = s.year ? String(s.year).trim().toLowerCase() : null;
      const gender = s.gender ? String(s.gender).trim().toLowerCase() : null;
      if (year && !VALID_YEARS.includes(year)) {
        return res.status(400).json({ error: `Invalid year "${year}" for ${id}. Must be one of: ${VALID_YEARS.join(", ")}` });
      }
      if (gender && !VALID_GENDERS.includes(gender)) {
        return res.status(400).json({ error: `Invalid gender "${gender}" for ${id}. Must be one of: ${VALID_GENDERS.join(", ")}` });
      }

      normalized.push({
        student_id: id,
        name: s.name ? String(s.name).trim() : null,
        year,
        gender,
      });
    }

    if (normalized.length === 0) {
      return res.status(400).json({ error: "No valid students provided" });
    }

    const generated = [];
    const reused = [];
    const skipped = [];

    for (const student of normalized) {
      // Upsert student record (keep existing data if already present)
      await db.query(
        `INSERT INTO students (student_id, name, year, gender, registered)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (student_id) DO UPDATE SET
           name = COALESCE(students.name, EXCLUDED.name),
           year = COALESCE(students.year, EXCLUDED.year),
           gender = COALESCE(students.gender, EXCLUDED.gender),
           updated_at = NOW()
         WHERE students.registered = false OR students.name IS NULL`,
        [student.student_id, student.name, student.year, student.gender]
      );

      // Check student's current registered status
      const reg = await db.query(
        `SELECT registered, name, year, gender FROM students WHERE student_id = $1`,
        [student.student_id]
      );

      // Check if any code was ever created for this student (used or unused).
      const existingCode = await db.query(
        "SELECT code, used FROM registration_codes WHERE student_id = $1 ORDER BY used ASC, id DESC LIMIT 1",
        [student.student_id]
      );

      if (existingCode.rows.length > 0) {
        const row = existingCode.rows[0];
        if (reg.rows[0]?.registered) {
          skipped.push({ student_id: student.student_id, reason: "already registered", ...reg.rows[0] });
        } else if (!row.used) {
          reused.push({ student_id: student.student_id, code: row.code, ...reg.rows[0] });
        } else {
          skipped.push({ student_id: student.student_id, reason: "code used", ...reg.rows[0] });
        }
        continue;
      }

      // Prevent collisions with a retry loop
      let code = generateCode();
      let attempts = 0;
      while (attempts < 5) {
        try {
          await db.query(
            "INSERT INTO registration_codes (student_id, code) VALUES ($1, $2)",
            [student.student_id, code]
          );
          generated.push({ student_id: student.student_id, code, ...reg.rows[0] });
          break;
        } catch (err) {
          if (err.code === "23505") {
            code = generateCode();
            attempts++;
            continue;
          }
          throw err;
        }
      }
    }

    return res.status(201).json({
      message: "Registration codes processed",
      generated,
      reused,
      skipped,
      count: generated.length,
      codes: [...generated, ...reused],
    });
  } catch (error) {
    console.error("generateCodes error:", error);
    return res.status(500).json({ error: "Failed to generate registration codes" });
  }
};

/**
 * GET /api/admin/codes
 * Query: ?used=true|false&studentId=GU001
 *
 * List registration codes (optionally filtered).
 */
export const listCodes = async (req, res) => {
  try {
    const { used, studentId } = req.query;
    let sql = `
      SELECT rc.id, rc.student_id, rc.code, rc.used, rc.created_at, rc.used_at,
             s.name, s.registered AS student_registered
      FROM registration_codes rc
      LEFT JOIN students s ON s.student_id = rc.student_id`;
    const where = [];
    const params = [];

    if (used !== undefined) {
      if (used === "true") {
        where.push(`(rc.used = true OR s.registered = true)`);
      } else {
        where.push(`(rc.used = false AND (s.registered IS NULL OR s.registered = false))`);
      }
    }
    if (studentId) {
      params.push(studentId);
      where.push(`rc.student_id = $${params.length}`);
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    sql += " ORDER BY rc.created_at DESC";

    const result = await db.query(sql, params);
    const codes = result.rows.map((row) => ({
      ...row,
      used: row.used || row.student_registered === true,
    }));
    return res.json({ codes });
  } catch (error) {
    console.error("listCodes error:", error);
    return res.status(500).json({ error: "Failed to list registration codes" });
  }
};
