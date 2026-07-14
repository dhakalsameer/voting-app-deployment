import express from "express";
import { electionContractV3 } from "../blockchain/electionContract.js";

const router = express.Router();

router.get("/phase", async (_req, res) => {
  try {
    const [phase, registrationEnd, votingEnd] = await Promise.all([
      electionContractV3.getPhase(),
      electionContractV3.registrationEnd(),
      electionContractV3.votingEnd(),
    ]);
    res.json({
      phase: Number(phase),
      registrationEnd: Number(registrationEnd),
      votingEnd: Number(votingEnd),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to read contract phase" });
  }
});

export default router;
