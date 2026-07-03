import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;



let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function buildEmailHtml({ name, student_id, code, electionName }) {
  const displayName = name || student_id;
  const title = electionName || "University IT Election";
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#10b981;text-align:center;">${title}</h2>
      <p>Dear ${displayName},</p>
      <p>Your registration code is:</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;font-size:20px;letter-spacing:4px;font-family:monospace;margin:16px 0;">
        <strong>${code}</strong>
      </div>
      <p><strong>Student ID:</strong> ${student_id}</p>
      <p>Use this code to complete your registration on the student portal.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#6b7280;font-size:12px;text-align:center;">Gandaki University — IT Club Election Commission</p>
    </div>
  `;
}

/**
 * Send a registration code email to a single student.
 * Falls back to console log in dev mode if SMTP is not configured.
 */
export async function sendRegistrationCode({ email, name, student_id, code, electionName }) {
  const t = getTransporter();

  const displayName = name || student_id;
  const title = electionName || "University IT Election";

  if (!t) {
    console.log("─── EMAIL (SMTP not configured — printed instead) ───");
    console.log(`To: ${email}`);
    console.log(`Subject: Your Registration Code for ${title}`);
    console.log(`Student: ${displayName} (${student_id})`);
    console.log(`Code: ${code}`);
    console.log("───────────────────────────────────────────────");
    return { devMode: true, email, student_id, code };
  }

  const info = await t.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: `Your Registration Code for ${title}`,
    html: buildEmailHtml({ name, student_id, code, electionName }),
  });

  return { messageId: info.messageId, email, student_id };
}

/**
 * Send registration codes to multiple students.
 * Returns { sent, failed, devMode }.
 */
export async function sendBatchRegistrationCodes(students, electionName) {
  const sent = [];
  const failed = [];
  let devMode = false;

  for (const s of students) {
    if (!s.email) {
      failed.push({ student_id: s.student_id, reason: "no email" });
      continue;
    }
    try {
      const result = await sendRegistrationCode({
        email: s.email,
        name: s.name,
        student_id: s.student_id,
        code: s.code,
        electionName,
      });
      if (result.devMode) devMode = true;
      sent.push(s.student_id);
    } catch (err) {
      failed.push({ student_id: s.student_id, reason: err.message });
    }
  }

  return { sent, failed, devMode };
}
