import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { db } from "../db.js";
import { config } from "../config/env.js";
import { uploadToIPFS } from "../services/ipfsService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

// In-memory upload so we can forward the buffer to Pinata or local storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error("Only PNG/JPEG/WEBP/GIF images are allowed"));
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single("photo");

/**
 * Save a file either to IPFS (if Pinata is configured) or to a local
 * /uploads directory. Returns { cid, url }.
 */
async function persistPhoto(buffer, originalName) {
  const ext = (path.extname(originalName) || ".png").toLowerCase();
  const id = crypto.randomBytes(16).toString("hex");
  const filename = `${id}${ext}`;

  if (config.pinataKey && config.pinataSecret) {
    const cid = await uploadToIPFS(buffer, filename);
    return { cid, url: `https://ipfs.io/ipfs/${cid}` };
  }

  // Local fallback: write to /uploads, return a URL the static server can serve.
  // WARNING: this storage is ephemeral unless the backend is deployed with a
  // persistent volume AND BACKEND_PUBLIC_URL points to a URL the browser can
  // reach. For permanent, decentralized storage, configure Pinata (PINATA_KEY
  // + PINATA_SECRET) so photos are pinned to IPFS instead.
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);

  // pseudo-CID so the field name is consistent with IPFS
  const cid = `local:${filename}`;
  const base = config.publicUrl || `http://localhost:${config.port || 5000}`;
  const url = `${base}/uploads/${filename}`;
  return { cid, url };
}

export async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "photo file is required (multipart field 'photo')" });
    }

    const { student_id } = req.user;
    const { cid, url } = await persistPhoto(req.file.buffer, req.file.originalname);

    const result = await db.query(
      `UPDATE students SET image_cid = $1, updated_at = NOW()
       WHERE student_id = $2
       RETURNING student_id, name, year, gender, image_cid,
                 wallet_address, wallet_verified, eligible_to_vote`,
      [cid, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const row = result.rows[0];
    if (row.wallet_address) {
      await db.query(
        `UPDATE candidates SET image_cid = $1 WHERE wallet_address = $2`,
        [cid, row.wallet_address]
      );
    }

    return res.json({
      success: true,
      image_cid: cid,
      image_url: url,
      storage: cid.startsWith("local:") ? "local" : "ipfs",
      student: {
        student_id: row.student_id,
        name: row.name,
        year: row.year,
        gender: row.gender,
        image_cid: row.image_cid,
        wallet_address: row.wallet_address,
        walletLinked: Boolean(row.wallet_address),
        walletVerified: Boolean(row.wallet_verified),
        eligibleToVote: Boolean(row.eligible_to_vote),
      },
    });
  } catch (error) {
    console.error("uploadPhoto error:", error);
    return res.status(500).json({ error: error.message || "Photo upload failed" });
  }
}
