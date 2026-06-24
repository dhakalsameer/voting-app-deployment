import { db } from "../db.js";
import { emitEvent } from "../socket.js";

export const createCandidate = async (req, res) => {
  const { name, student_id, position, image_cid, blockchain_id, year, gender } = req.body;

  const result = await db.query(
    `INSERT INTO candidates (name, student_id, position, image_cid, blockchain_id, vote_count, status, year, gender)
     VALUES ($1,$2,$3,$4,$5,0,'approved',$6,$7) RETURNING *`,
    [name, student_id, position, image_cid, blockchain_id, year || null, gender || null]
  );

  res.json(result.rows[0]);
};

export const getCandidates = async (req, res) => {
  try {
    const { applied_by } = req.query;

    if (applied_by) {
      // Student portal: check own application status
      const result = await db.query(
        `SELECT * FROM candidates WHERE applied_by = $1 ORDER BY created_at DESC`,
        [applied_by]
      );
      return res.json(result.rows);
    }

    // Public: only approved candidates
    const result = await db.query(
      `SELECT * FROM candidates WHERE status = 'approved' OR status IS NULL ORDER BY position, created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getCandidates error:", error);
    return res.status(500).json({ error: "Failed to load candidates" });
  }
};

/**
 * Student applies to become a candidate.
 * Body: { position, manifesto? }
 * Name, year, gender are pulled from the student's DB record — NOT the request body.
 */
export const applyCandidate = async (req, res) => {
  try {
    const { position, manifesto } = req.body;
    const studentId = req.student?.student_id;

    if (!studentId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!position) {
      return res.status(400).json({ error: "Position is required" });
    }

    // Verify student exists and is fully verified
    const studentRes = await db.query(
      `SELECT student_id, name, year, gender, eligible_to_vote, wallet_address, wallet_verified
       FROM students WHERE student_id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentRes.rows[0];

    if (!student.wallet_verified || !student.wallet_address) {
      return res.status(403).json({ error: "Wallet must be linked and verified by admin" });
    }
    if (!student.eligible_to_vote) {
      return res.status(403).json({ error: "You must be in the Merkle whitelist (verified voter) before applying as a candidate" });
    }

    // Check for existing pending/approved application from this student
    const existing = await db.query(
      `SELECT id, status FROM candidates
       WHERE applied_by = $1 AND status IN ('pending', 'approved')
       LIMIT 1`,
      [studentId]
    );

    if (existing.rows.length > 0) {
      const app = existing.rows[0];
      return res.status(409).json({
        error: `You already have an application (${app.status}). Contact admin if you need to change it.`,
        existingId: app.id,
      });
    }

    // Pull name, year, gender from DB record — prevents manipulation
    const result = await db.query(
      `INSERT INTO candidates (name, student_id, position, image_cid, status, applied_by, applied_at, year, gender)
       VALUES ($1,$2,$3,$4,'pending',$5,NOW(),$6,$7)
       RETURNING *`,
      [student.name, studentId, position, null, studentId, student.year, student.gender]
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted. Pending election committee review.",
      candidate: result.rows[0],
    });
  } catch (error) {
    console.error("applyCandidate error:", error);
    return res.status(500).json({ error: error.message || "Application failed" });
  }
};

export const getPendingCandidates = async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, s.wallet_address
       FROM candidates c
       LEFT JOIN students s ON c.applied_by = s.student_id
       WHERE c.status = 'pending'
       ORDER BY c.applied_at DESC`
    );
    return res.json({ candidates: result.rows });
  } catch (error) {
    console.error("getPendingCandidates error:", error);
    return res.status(500).json({ error: "Failed to load pending candidates" });
  }
};

export const approveCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const appRes = await db.query(
      `SELECT c.*, s.wallet_address, s.name, s.year, s.gender
       FROM candidates c
       LEFT JOIN students s ON c.applied_by = s.student_id
       WHERE c.id = $1 AND c.status = 'pending'`,
      [id]
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: "Pending application not found" });
    }

    const app = appRes.rows[0];

    // Note: On-chain candidate registration is now self-service via registerCandidate().
    // Admin approval here only marks the DB record as approved so the student
    // can proceed to register on-chain using their identity Merkle proof.
    await db.query(
      `UPDATE candidates
       SET status = 'approved',
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    emitEvent("dataChanged", { type: "candidates" });

    return res.json({
      success: true,
      message: `Candidate "${app.name}" approved. Student can now self-register on-chain.`,
      candidate: { ...app, status: "approved" },
    });
  } catch (error) {
    console.error("approveCandidate error:", error);
    return res.status(500).json({
      error: error.message || "Approval failed",
    });
  }
};

export const rejectCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const appRes = await db.query(
      `SELECT * FROM candidates WHERE id = $1 AND status = 'pending'`,
      [id]
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: "Pending application not found" });
    }

    await db.query(
      `UPDATE candidates SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    emitEvent("dataChanged", { type: "candidates" });

    return res.json({ success: true, message: "Application rejected" });
  } catch (error) {
    console.error("rejectCandidate error:", error);
    return res.status(500).json({ error: "Rejection failed" });
  }
};

function positionToEnum(position) {
  const p = String(position).toLowerCase();
  if (p === "president" || p === "0") return 0;
  if (p === "secretary" || p === "1") return 1;
  return 2; // General Member
}
