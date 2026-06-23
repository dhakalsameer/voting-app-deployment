import { electionContract, electionContractV3 } from "./electionContract.js";
import { db } from "../db.js";

export function startBlockchainSync(io) {
  console.log("🔄 Blockchain sync engine running (Real-time Broadcast enabled)...");

  async function broadcastResults() {
    if (!io) return;
    try {
      const result = await db.query("SELECT blockchain_id as id, name, position, vote_count FROM candidates ORDER BY vote_count DESC");
      io.emit("voteUpdate", result.rows);
    } catch (err) {
      console.error("Broadcast results error:", err.message);
    }
  }

  // V3 Syncing
  if (electionContractV3.target && electionContractV3.target !== "0x0000000000000000000000000000000000000000") {
    electionContractV3.on("VoteCast", async (voter, candidateId) => {
      console.log(`🗳️ [V3] Vote detected from ${voter} for candidate ${candidateId}`);
      try {
        await db.query(
          `INSERT INTO voters (wallet_address, has_voted, voted_at)
           VALUES ($1, true, NOW())
           ON CONFLICT (wallet_address)
           DO UPDATE SET has_voted = true, voted_at = NOW()`,
          [voter]
        );
        await db.query(
          `UPDATE candidates SET vote_count = vote_count + 1 WHERE blockchain_id = $1`,
          [Number(candidateId)]
        );
        
        // 🔥 Real-time Broadcast
        broadcastResults();
      } catch (err) {
        console.error("[V3] sync error:", err.message);
      }
    });

    electionContractV3.on("CandidateRegistered", async (id, candidateAddr, name, position) => {
      console.log(`👤 [V3] Candidate registered on-chain: ${name} (ID: ${id}, position: ${position})`);
      try {
        const posName = position === 0 ? "President" : position === 1 ? "Secretary" : "General Member";
        await db.query(
          `INSERT INTO candidates (name, student_id, position, image_cid, blockchain_id, vote_count, status, year, gender, applied_by, created_at)
           VALUES ($1, NULL, $2, NULL, $3, 0, 'approved', NULL, NULL, NULL, NOW())
           ON CONFLICT (blockchain_id)
           DO UPDATE SET name = $1, position = $2, status = 'approved', updated_at = NOW()`,
          [name, posName, Number(id)]
        );
        broadcastResults();
      } catch (err) {
        console.error("[V3] candidate sync error:", err.message);
      }
    });
  }

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
      
      // V1 logic usually updates many counts. 
      // For simplicity in real-time demo, we just trigger a full broadcast
      broadcastResults();
      
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

  electionContract.on("CandidateRegistered", async (id, guid, position) => {
    console.log(`👤 New candidate registered: ${guid} (ID: ${id}, position: ${position})`);
  });

  electionContract.on("VotersVerified", async (voters) => {
    console.log(`✅ ${voters.length} voter(s) verified on-chain`);

    try {
      await db.query(
        `UPDATE students
         SET eligible_to_vote = true
         WHERE LOWER(wallet_address) = ANY($1::text[])`,
        [voters.map((wallet) => wallet.toLowerCase())]
      );
    } catch (err) {
      console.error("Voter verification sync error:", err.message);
    }
  });

  electionContract.on("VoterRevoked", async (voter) => {
    console.log(`⛔ Voter revoked on-chain: ${voter}`);

    try {
      await db.query(
        `UPDATE students SET eligible_to_vote = false WHERE LOWER(wallet_address) = LOWER($1)`,
        [voter]
      );
    } catch (err) {
      console.error("Voter revoke sync error:", err.message);
    }
  });

  electionContract.on("VerificationLocked", () => {
    console.log("🔒 Voter verification locked. Election is ready to begin.");
  });

  electionContract.on("RegistrationStarted", (startTime, endTime) => {
    console.log(
      `📝 Registration window: ${new Date(Number(startTime) * 1000).toLocaleString()} → ${new Date(Number(endTime) * 1000).toLocaleString()}`
    );
  });

  electionContract.on("ElectionStarted", (startTime, endTime) => {
    console.log(
      `🚀 Voting window: ${new Date(Number(startTime) * 1000).toLocaleString()} → ${new Date(Number(endTime) * 1000).toLocaleString()}`
    );
  });

  electionContract.on("ElectionFinalized", () => {
    console.log("🏁 Election finalized and results locked.");
  });
}
