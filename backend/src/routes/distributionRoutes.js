import express from "express";
import { getDistributionStats, distributeGas, getDistributionHistory, getDistributionSummary, retryDistribution } from "../controllers/distributionController.js";
import { verifyAdmin } from "../middleware/admin.js";

const router = express.Router();

router.get("/stats", getDistributionStats);
router.get("/summary", verifyAdmin, getDistributionSummary);
router.get("/history", verifyAdmin, getDistributionHistory);
router.post("/send", verifyAdmin, distributeGas);
router.post("/retry", verifyAdmin, retryDistribution);

export default router;
