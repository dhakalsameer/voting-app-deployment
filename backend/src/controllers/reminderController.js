import { db } from "../db.js";
import { sendReminders, getReminderConfig, updateReminderConfig, startReminderJob, stopReminderJob } from "../services/reminderService.js";

/**
 * GET /api/admin/reminder-config
 * Returns current reminder config and stats.
 */
export const getConfig = async (_req, res) => {
  try {
    const config = getReminderConfig();
    return res.json(config);
  } catch (error) {
    console.error("getReminderConfig error:", error);
    return res.status(500).json({ error: "Failed to get reminder config" });
  }
};

/**
 * POST /api/admin/reminder-config
 * Body: { enabled?: boolean, cronExpression?: string }
 * Updates reminder config and restarts the cron job.
 */
export const updateConfig = async (req, res) => {
  try {
    const { enabled, cronExpression } = req.body;

    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (cronExpression !== undefined) updates.cronExpression = cronExpression;

    updateReminderConfig(updates);

    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        startReminderJob();
      } else {
        stopReminderJob();
      }
    } else if (enabled === undefined && cronExpression) {
      // cron expression changed while running — restart
      const current = getReminderConfig();
      if (current.enabled) {
        startReminderJob();
      }
    }

    const config = getReminderConfig();
    return res.json(config);
  } catch (error) {
    console.error("updateReminderConfig error:", error);
    return res.status(500).json({ error: "Failed to update reminder config" });
  }
};

/**
 * POST /api/admin/send-reminders
 * Manually trigger reminder emails (regardless of schedule).
 */
export const triggerReminders = async (_req, res) => {
  try {
    const result = await sendReminders();
    return res.json({
      message: `Reminders sent to ${result.sent.length} student(s)`,
      ...result,
    });
  } catch (error) {
    console.error("triggerReminders error:", error);
    return res.status(500).json({ error: error.message || "Failed to send reminders" });
  }
};

/**
 * GET /api/admin/pending-codes
 * Returns count of pending (unused) codes with email.
 */
export const getPendingStats = async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE s.email IS NOT NULL) AS with_email
       FROM registration_codes rc
       LEFT JOIN students s ON s.student_id = rc.student_id
       WHERE rc.used = false`
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("getPendingStats error:", error);
    return res.status(500).json({ error: "Failed to get pending stats" });
  }
};
