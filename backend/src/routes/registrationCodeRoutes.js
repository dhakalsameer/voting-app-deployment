import express from "express";
import multer from "multer";
import { generateCodes, listCodes, getRegCodeMerkleRoot, adminRebuildRegCodeMerkleRoot, sendCodesEmail } from "../controllers/registrationCodeController.js";
import { uploadCodes } from "../controllers/uploadCodesController.js";
import { verifyAdmin } from "../middleware/admin.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      return cb(new Error("Only .xlsx, .xls, and .csv files are allowed"));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post("/generate-codes", verifyAdmin, generateCodes);
router.get("/codes", verifyAdmin, listCodes);
router.post("/upload-codes", verifyAdmin, upload.single("file"), uploadCodes);
router.get("/regcode-merkle-root", verifyAdmin, getRegCodeMerkleRoot);
router.post("/rebuild-regcode-merkle-root", verifyAdmin, adminRebuildRegCodeMerkleRoot);
router.post("/send-codes", verifyAdmin, sendCodesEmail);

export default router;
