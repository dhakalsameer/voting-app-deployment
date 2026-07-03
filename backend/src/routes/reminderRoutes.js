import express from "express";
import { getConfig, updateConfig, triggerReminders, getPendingStats } from "../controllers/reminderController.js";
import { verifyAdmin } from "../middleware/admin.js";

const router = express.Router();

router.get("/reminder-config", verifyAdmin, getConfig);
router.post("/reminder-config", verifyAdmin, updateConfig);
router.post("/send-reminders", verifyAdmin, triggerReminders);
router.get("/pending-codes", verifyAdmin, getPendingStats);

export default router;
