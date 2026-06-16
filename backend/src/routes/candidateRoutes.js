import express from "express";
import { createCandidate, getCandidates } from "../controllers/candidateController.js";

const router = express.Router();

router.post("/", createCandidate);
router.get("/", getCandidates);

export default router;
