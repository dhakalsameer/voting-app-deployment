import express from "express";
import { getDistributionStats, distributeGas, getDistributionHistory } from "../controllers/distributionController.js";
import { verifyAdmin } from "../middleware/admin.js";

const router = express.Router();

router.get("/stats", getDistributionStats);
router.get("/history", verifyAdmin, getDistributionHistory);
router.post("/send", verifyAdmin, distributeGas);

export default router;
