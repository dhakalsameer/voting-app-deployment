import nodemailer from "nodemailer";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const DEFAULT_FROM = "GU Election <noreply@nishanpaudel.info.np>";

let resend = null;
let transporter = null;

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
      <p style="font-size:16px;"><strong>Student ID:</strong> ${student_id}</p>
      <p>Use this code to complete your registration on the student portal.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#6b7280;font-size:12px;text-align:center;">Gandaki University — IT Club Election Commission</p>
    </div>
  `;
}

/**
 * Send a registration code email to a single student.
 * Tries Resend first, falls back to Gmail SMTP, then console log.
 */
export async function sendRegistrationCode({ email, name, student_id, code, electionName }) {
  const displayName = name || student_id;
  const title = electionName || "University IT Election";

  if (RESEND_API_KEY) {
    try {
      if (!resend) resend = new Resend(RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: DEFAULT_FROM,
        to: email,
        subject: `Your Registration Code for ${title}`,
        html: buildEmailHtml({ name, student_id, code, electionName }),
      });
      if (error) throw new Error(error.message);
      return { messageId: data?.id, email, student_id };
    } catch (err) {
      console.warn("Resend failed, falling back to SMTP:", err.message);
    }
  }

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: parseInt(SMTP_PORT, 10) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
      }
      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: email,
        subject: `Your Registration Code for ${title}`,
        html: buildEmailHtml({ name, student_id, code, electionName }),
      });
      return { messageId: info.messageId, email, student_id };
    } catch (err) {
      console.warn("SMTP also failed:", err.message);
    }
  }

  console.log("─── EMAIL (no provider configured — printed instead) ───");
  console.log(`To: ${email}`);
  console.log(`Subject: Your Registration Code for ${title}`);
  console.log(`Student: ${displayName} (${student_id})`);
  console.log(`Code: ${code}`);
  console.log("───────────────────────────────────────────────────────");
  return { devMode: true, email, student_id, code };
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
  if (RESEND_API_KEY) {
    try {
      if (!resend) resend = new Resend(RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: DEFAULT_FROM,
        to: email,
        subject: `🎉 Congratulations ${name} — You Won Election #${electionNumber}!`,
        html: buildWinnerEmailHtml({ name, position, voteCount, electionNumber }),
      });
      if (error) throw new Error(error.message);
      return { messageId: data?.id, email };
    } catch (err) {
      console.warn("Resend failed, falling back to SMTP:", err.message);
    }
  }

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: parseInt(SMTP_PORT, 10) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
      }
      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: email,
        subject: `🎉 Congratulations ${name} — You Won Election #${electionNumber}!`,
        html: buildWinnerEmailHtml({ name, position, voteCount, electionNumber }),
      });
      return { messageId: info.messageId, email };
    } catch (err) {
      console.warn("SMTP also failed:", err.message);
    }
  }

  console.log("─── WINNER EMAIL (no provider configured) ───");
  console.log(`To: ${email}`);
  console.log(`Subject: 🎉 Congratulations ${name} — You Won Election #${electionNumber}!`);
  console.log(`Position: ${position}, Votes: ${voteCount}`);
  console.log("───────────────────────────────────────────────");
  return { devMode: true, email };
}

function buildPhaseEmailHtml({ phaseLabel, electionNumber }) {
  const appUrl = "https://gu-voting.vercel.app";
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <div style="text-align:center;font-size:36px;margin-bottom:12px;">📢</div>
      <h2 style="color:#10b981;text-align:center;">Election Update</h2>
      <p style="text-align:center;font-size:13px;color:#9ca3af;margin-bottom:16px;">${dateStr}</p>
      <p style="text-align:center;font-size:16px;color:#374151;">
        Election #${electionNumber} is now in the <strong>${phaseLabel}</strong> phase.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="font-size:14px;color:#166534;margin:0 0 12px 0;">
          Please check the voting platform for details and your next steps.
        </p>
        <a href="${appUrl}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;font-weight:bold;padding:10px 24px;border-radius:6px;font-size:14px;">
          Go to Voting Platform
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#6b7280;font-size:12px;text-align:center;">Gandaki University — IT Club Election Commission</p>
    </div>
  `;
}

const PHASE_LABELS = ["Setup", "Registration", "Voting", "Completed"];

function buildVerifiedHtml({ name }) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#10b981;text-align:center;">You Are Verified ✓</h2>
      <p>Dear ${name},</p>
      <p>Congratulations! The election commission has verified your identity. You are now eligible to vote in the Gandaki University IT Club Election.</p>
      <p style="margin-top:20px;">When voting opens, connect your wallet and cast your vote on the student portal.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#6b7280;font-size:12px;text-align:center;">Gandaki University — IT Club Election Commission</p>
    </div>
  `;
}

export async function sendVoterVerifiedEmail({ email, name }) {
  if (!email) return { devMode: true };

  const subject = `✅ You're Verified — Eligible to Vote`;

  if (RESEND_API_KEY) {
    try {
      if (!resend) resend = new Resend(RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: DEFAULT_FROM,
        to: email,
        subject,
        html: buildVerifiedHtml({ name }),
      });
      if (error) throw new Error(error.message);
      return { messageId: data?.id, email };
    } catch (err) {
      console.warn("Resend failed, falling back to SMTP:", err.message);
    }
  }

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: parseInt(SMTP_PORT, 10) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
      }
      await transporter.sendMail({ from: SMTP_FROM || SMTP_USER, to: email, subject, html: buildVerifiedHtml({ name }) });
    } catch (err) {
      console.warn("SMTP failed:", err.message);
    }
  } else {
    console.log("─── VERIFIED EMAIL ───");
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Name: ${name}`);
    console.log("─────────────────────");
  }
}

export async function sendPhaseChangeNotification({ email, name, newPhase, electionNumber }) {
  const phaseLabel = PHASE_LABELS[newPhase] || `Phase ${newPhase}`;
  const subject = `📢 Election #${electionNumber} — ${phaseLabel} Phase Started`;

  if (RESEND_API_KEY) {
    try {
      if (!resend) resend = new Resend(RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: DEFAULT_FROM,
        to: email,
        subject,
        html: buildPhaseEmailHtml({ phaseLabel, electionNumber }),
      });
      if (error) throw new Error(error.message);
      return { messageId: data?.id, email };
    } catch (err) {
      console.warn("Resend failed, falling back to SMTP:", err.message);
    }
  }

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: parseInt(SMTP_PORT, 10) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
      }
      const info = await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: email,
        subject,
        html: buildPhaseEmailHtml({ phaseLabel, electionNumber }),
      });
      return { messageId: info.messageId, email };
    } catch (err) {
      console.warn("SMTP also failed:", err.message);
    }
  }

  console.log("─── PHASE EMAIL (no provider configured) ───");
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log("────────────────────────────────────────────");
  return { devMode: true, email };
}

export async function sendNewRegistrationAlert({ name, studentId, wallet }) {
  if (!ADMIN_EMAIL) {
    console.log("─── ADMIN ALERT (ADMIN_EMAIL not set) ───");
    console.log(`Student: ${name} (${studentId}) registered with wallet ${wallet}`);
    return { devMode: true };
  }

  const subject = `🔔 New Voter Registered — ${name} (${studentId})`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#10b981;text-align:center;">New Voter Registration</h2>
      <p>A new student has completed registration:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Student ID</td><td style="padding:8px;border:1px solid #e5e7eb;">${studentId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Wallet</td><td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;font-size:12px;">${wallet}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;">Verify this voter on the admin dashboard if needed.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#6b7280;font-size:12px;text-align:center;">Gandaki University — IT Club Election Commission</p>
    </div>
  `;

  if (RESEND_API_KEY) {
    try {
      if (!resend) resend = new Resend(RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: DEFAULT_FROM,
        to: ADMIN_EMAIL,
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      return { messageId: data?.id };
    } catch (err) {
      console.warn("Resend failed, falling back to SMTP:", err.message);
    }
  }

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    try {
      if (!transporter) {
        transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: parseInt(SMTP_PORT, 10) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
      }
      await transporter.sendMail({ from: SMTP_FROM || SMTP_USER, to: ADMIN_EMAIL, subject, html });
    } catch (err) {
      console.warn("SMTP also failed:", err.message);
    }
  } else {
    console.log("─── ADMIN ALERT ───");
    console.log(`To: ${ADMIN_EMAIL}`);
    console.log(`Subject: ${subject}`);
    console.log(`Student: ${name} (${studentId}) — Wallet: ${wallet}`);
    console.log("───────────────────");
  }
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
