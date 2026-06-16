import { electionContract } from "./electionContract.js";
import { db } from "../db.js";

export function startBlockchainSync() {
  console.log("🔄 Blockchain sync engine running...");

  // Listen for votes (structured)
  electionContract.on("VoteCast", async (voter, presidentId, secretaryId, memberIds) => {
    console.log(`🗳️ Vote detected from ${voter}`);

    try {
      // Mark voter as voted
      await db.query(
        `INSERT INTO voters (wallet_address, has_voted, voted_at)
         VALUES ($1, true, NOW())
         ON CONFLICT (wallet_address)
         DO UPDATE SET has_voted = true, voted_at = NOW()`,
        [voter]
      );
      console.log(`✅ Voter ${voter} synced`);
    } catch (err) {
      console.error("Voter sync error:", err.message);
    }
  });

  // Listen for individual vote updates to keep counts accurate
  electionContract.on("VoteUpdated", async (candidateId, newVoteCount) => {
    console.log(`📊 Vote count update: Candidate ${candidateId} -> ${newVoteCount}`);
    try {
      await db.query(
        `UPDATE candidates SET vote_count = $1 WHERE blockchain_id = $2`,
        [Number(newVoteCount), Number(candidateId)]
      );
    } catch (err) {
      console.error("Candidate vote sync error:", err.message);
    }
  });

  electionContract.on("CandidateRegistered", async (id, name, position) => {
    console.log(`👤 New candidate registered: ${name} (ID: ${id})`);
  });

  electionContract.on("ElectionStarted", (startTime, endTime) => {
    console.log(`🚀 Election started! Ends at ${new Date(Number(endTime) * 1000).toLocaleString()}`);
  });

  electionContract.on("ElectionEnded", () => {
    console.log("🏁 Election ended.");
  });
}
