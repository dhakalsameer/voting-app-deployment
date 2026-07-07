import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getCandidates, getPendingCandidates, applyAsCandidate, approveCandidate, rejectCandidate, getCandidateByWallet, getMyCandidateStatus } from "../controllers/candidateController.js";
import { uploadToIPFS } from "../services/ipfsService.js";
import { requireStudentAuth } from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/admin.js";
import { config } from "../config/env.js";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error("Only PNG/JPEG/WEBP/GIF images are allowed"));
    }
    cb(null, true);
  },
});

async function persistCandidatePhoto(buffer, originalName) {
  const ext = (path.extname(originalName) || ".png").toLowerCase();
  const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;

  if (config.pinataKey && config.pinataSecret) {
    const cid = await uploadToIPFS(buffer, filename);
    const url = `https://ipfs.io/ipfs/${cid}`;
    return { cid, url };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  const cid = `local:${filename}`;
  const base = config.publicUrl || `http://localhost:${config.port || 5000}`;
  const url = `${base}/uploads/${filename}`;
  return { cid, url };
}

const router = express.Router();

router.get("/", getCandidates);
router.get("/pending", verifyAdmin, getPendingCandidates);
router.get("/by-wallet/:wallet", getCandidateByWallet);
router.post("/apply", requireStudentAuth, applyAsCandidate);
router.get("/me", requireStudentAuth, getMyCandidateStatus);
router.post("/:id/approve", verifyAdmin, approveCandidate);
router.post("/:id/reject", verifyAdmin, rejectCandidate);

router.post("/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "photo file is required" });
    }

    const { cid, url } = await persistCandidatePhoto(req.file.buffer, req.file.originalname);

    res.json({
      success: true,
      url,
      cid,
      storage: cid.startsWith("local:") ? "local" : "ipfs",
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

export default router;
