import express from "express";
import { getCandidates } from "../controllers/candidateController.js";

const router = express.Router();

// Public: list approved candidates
router.get("/", getCandidates);

export default router;
