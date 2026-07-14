import cron from "node-cron";
import { db } from "../db.js";
import { sendBatchRegistrationCodes } from "./emailService.js";

let reminderJob = null;
let config = {
  enabled: false,
  cronExpression: "0 9 * * *", // daily at 9 AM
  reminderMessage: "Reminder: You still have an unused registration code for the University Election.",
  lastRun: null,
  lastSentCount: 0,
};

/**
 * Start the scheduled reminder cron job.
 * @param {object} userConfig - Override default config
 */
export function startReminderJob(userConfig = {}) {
  Object.assign(config, userConfig);

  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
  }

  if (!config.enabled) {
    console.log("📧 Reminder emails DISABLED");
    return;
  }

  if (!cron.validate(config.cronExpression)) {
    console.error(`Invalid cron expression: ${config.cronExpression}`);
    return;
  }

  reminderJob = cron.schedule(config.cronExpression, async () => {
    console.log(`📧 Running reminder job at ${new Date().toISOString()}`);
    try {
      await sendReminders();
    } catch (err) {
      console.error("Reminder job failed:", err.message);
    }
  });

  console.log(`📧 Reminder emails ENABLED (${config.cronExpression})`);
}

/**
 * Stop the scheduled reminder job.
 */
export function stopReminderJob() {
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
  }
  config.enabled = false;
  console.log("📧 Reminder emails STOPPED");
}

/**
 * Send reminder emails to all students with unused codes.
 */
export async function sendReminders() {
  const result = await db.query(
    `SELECT rc.student_id, rc.code, s.name, s.email
     FROM registration_codes rc
     LEFT JOIN students s ON s.student_id = rc.student_id
     WHERE rc.used = false
       AND s.email IS NOT NULL`
  );

  if (result.rows.length === 0) {
    console.log("📧 No pending students to remind");
    config.lastRun = new Date().toISOString();
    config.lastSentCount = 0;
    return { sent: [], failed: [], total: 0 };
  }

  const { sent, failed, devMode } = await sendBatchRegistrationCodes(result.rows);
  config.lastRun = new Date().toISOString();
  config.lastSentCount = sent.length;

  console.log(`📧 Reminder sent to ${sent.length} student(s)` + (failed.length ? `, ${failed.length} failed` : ""));

  return { sent, failed, total: result.rows.length, devMode };
}

/**
 * Get current reminder config and stats.
 */
export function getReminderConfig() {
  return { ...config };
}

/**
 * Update reminder config dynamically.
 */
export function updateReminderConfig(updates) {
  Object.assign(config, updates);
  return { ...config };
}
