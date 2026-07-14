import nodemailer from "nodemailer";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;

const DEFAULT_FROM = "GU Election <onboarding@resend.dev>";

let resend = null;
let transporter = null;

function getSender() {
  if (RESEND_API_KEY) {
    if (!resend) resend = new Resend(RESEND_API_KEY);
    return { type: "resend", client: resend };
  }
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
    return { type: "smtp", client: transporter };
  }
  return null;
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
 * Uses Resend if configured, falls back to Gmail SMTP, then console log.
 */
export async function sendRegistrationCode({ email, name, student_id, code, electionName }) {
  const sender = getSender();
  const displayName = name || student_id;
  const title = electionName || "University IT Election";

  if (!sender) {
    console.log("─── EMAIL (no provider configured — printed instead) ───");
    console.log("  Set RESEND_API_KEY or SMTP_* env vars to send real emails.");
    console.log(`To: ${email}`);
    console.log(`Subject: Your Registration Code for ${title}`);
    console.log(`Student: ${displayName} (${student_id})`);
    console.log(`Code: ${code}`);
    console.log("───────────────────────────────────────────────────────");
    return { devMode: true, email, student_id, code };
  }

  if (sender.type === "resend") {
    const { data, error } = await sender.client.emails.send({
      from: SMTP_FROM || DEFAULT_FROM,
      to: email,
      subject: `Your Registration Code for ${title}`,
      html: buildEmailHtml({ name, student_id, code, electionName }),
    });
    if (error) throw new Error(error.message);
    return { messageId: data?.id, email, student_id };
  }

  const info = await sender.client.sendMail({
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
function buildWinnerEmailHtml({ name, position, voteCount, electionNumber }) {
  const posLabel = position || "a position";
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="text-align:center;font-size:40px;margin-bottom:12px;">🎉🏆</div>
      <h2 style="color:#10b981;text-align:center;">Congratulations, ${name}!</h2>
      <p style="text-align:center;font-size:16px;color:#374151;">
        You have been elected as <strong>${posLabel}</strong> in
        <strong>Election #${electionNumber}</strong>
        with <strong>${voteCount}</strong> vote${voteCount !== 1 ? "s" : ""}.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="font-size:14px;color:#166534;margin:0;">
          Your peers trust you to lead. Make them proud.
        </p>
      </div>
      <p style="color:#6b7280;font-size:13px;">The results are recorded on-chain and can be verified anytime.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#6b7280;font-size:12px;text-align:center;">Gandaki University — IT Club Election Commission</p>
    </div>
  `;
}

export async function sendWinnerCongratulation({ email, name, position, voteCount, electionNumber }) {
  const sender = getSender();

  if (!sender) {
    console.log("─── WINNER EMAIL (no provider configured) ───");
    console.log(`To: ${email}`);
    console.log(`Subject: 🎉 Congratulations ${name} — You Won Election #${electionNumber}!`);
    console.log(`Position: ${position}, Votes: ${voteCount}`);
    console.log("───────────────────────────────────────────────");
    return { devMode: true, email };
  }

  if (sender.type === "resend") {
    const { data, error } = await sender.client.emails.send({
      from: SMTP_FROM || DEFAULT_FROM,
      to: email,
      subject: `🎉 Congratulations ${name} — You Won Election #${electionNumber}!`,
      html: buildWinnerEmailHtml({ name, position, voteCount, electionNumber }),
    });
    if (error) throw new Error(error.message);
    return { messageId: data?.id, email };
  }

  const info = await sender.client.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: email,
    subject: `🎉 Congratulations ${name} — You Won Election #${electionNumber}!`,
    html: buildWinnerEmailHtml({ name, position, voteCount, electionNumber }),
  });
  return { messageId: info.messageId, email };
}

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
