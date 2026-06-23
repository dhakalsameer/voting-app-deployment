import express from "express";
import { getDistributionStats, distributeGas } from "../controllers/distributionController.js";
import { verifyAdmin } from "../middleware/admin.js";

const router = express.Router();

router.get("/stats", getDistributionStats);
router.post("/send", verifyAdmin, distributeGas);

export default router;
