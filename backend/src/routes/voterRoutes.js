import express from "express";
import { bulkVerifyVoters, getMe, getPendingVoters, revokeVoter, getProof, getIdentityProof, adminRebuildMerkle } from "../controllers/voterController.js";
import { verifyAdmin } from "../middleware/admin.js";

const router = express.Router();

router.get("/me", getMe);
router.get("/pending", getPendingVoters);
router.get("/proof", getProof);
router.get("/identity-proof", getIdentityProof);
router.post("/verify-bulk", verifyAdmin, bulkVerifyVoters);
router.post("/revoke", verifyAdmin, revokeVoter);
router.post("/rebuild-merkle", verifyAdmin, adminRebuildMerkle);

export default router;
