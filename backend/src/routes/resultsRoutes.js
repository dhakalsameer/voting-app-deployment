import express from "express";
import { db } from "../db.js";
import { electionContractV3 } from "../blockchain/electionContract.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM candidates ORDER BY vote_count DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [voterResult, voteResult, candidateResult, posResult] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS total FROM students WHERE eligible_to_vote = true"),
      db.query("SELECT COALESCE(SUM(vote_count), 0)::int AS cast FROM candidates"),
      db.query("SELECT COUNT(*)::int AS total FROM candidates"),
      db.query("SELECT position, COUNT(*)::int AS candidates, SUM(vote_count)::int AS votes FROM candidates GROUP BY position ORDER BY position"),
    ]);

    const totalVoters = voterResult.rows[0].total;
    const votesCast = voteResult.rows[0].cast;
    const candidateCount = candidateResult.rows[0].total;
    const remaining = Math.max(0, totalVoters - votesCast);
    const turnout = totalVoters > 0 ? ((votesCast / totalVoters) * 100).toFixed(1) : "0.0";

    let phase = 0;
    let votingEnd = 0;
    try {
      phase = Number(await electionContractV3.getPhase());
      votingEnd = Number(await electionContractV3.votingEnd());
    } catch {}

    res.json({
      totalVoters, votesCast, remaining,
      turnout: Number(turnout), candidateCount, phase, votingEnd,
      positions: posResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT election_number, candidate_name, candidate_position, candidate_year, candidate_gender, candidate_photo, vote_count, snapshot_at
       FROM election_history
       ORDER BY election_number DESC, candidate_position, vote_count DESC`
    );

    const grouped = {};
    for (const row of result.rows) {
      const num = row.election_number;
      if (!grouped[num]) {
        grouped[num] = {
          election_number: num,
          snapshot_at: row.snapshot_at,
          candidates: [],
        };
      }
      grouped[num].candidates.push({
        name: row.candidate_name,
        position: row.candidate_position,
        vote_count: row.vote_count,
        year: row.candidate_year,
        gender: row.candidate_gender,
        photo: row.candidate_photo,
      });
    }

    res.json(Object.values(grouped).sort((a, b) => b.election_number - a.election_number));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
