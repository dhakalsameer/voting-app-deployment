import express from "express";
import {
  createCandidate,
  getCandidates,
  applyCandidate,
  getPendingCandidates,
  approveCandidate,
  rejectCandidate,
} from "../controllers/candidateController.js";
import { verifyAdmin } from "../middleware/admin.js";
import { requireStudentAuth } from "../middleware/auth.js";

const router = express.Router();

// Public: list approved candidates
router.get("/", getCandidates);

// Student: apply to become a candidate (requires portal JWT)
router.post("/apply", requireStudentAuth, applyCandidate);

// Admin: list pending candidate applications
router.get("/pending", verifyAdmin, getPendingCandidates);

// Admin: approve a pending candidate → add on-chain
router.post("/:id/approve", verifyAdmin, approveCandidate);

// Admin: reject a pending candidate
router.post("/:id/reject", verifyAdmin, rejectCandidate);

// Admin: direct creation (legacy bypass — still available)
router.post("/", createCandidate);

export default router;
