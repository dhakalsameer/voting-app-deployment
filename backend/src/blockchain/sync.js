import { electionContractV3 } from "./electionContract.js";
import { db } from "../db.js";
import { addEvent } from "../services/eventStore.js";

export function startBlockchainSync(io) {
  console.log("🔄 Blockchain sync engine running (Real-time Broadcast enabled)...");

  function emitEvent(event) {
    addEvent(event);
    if (io) io.emit("blockchainEvent", event);
  }

  async function broadcastResults() {
    if (!io) return;
    try {
      const result = await db.query("SELECT blockchain_id as id, name, position, vote_count FROM candidates ORDER BY vote_count DESC");
      io.emit("voteUpdate", result.rows);
    } catch (err) {
      console.error("Broadcast results error:", err.message);
    }
  }

  if (electionContractV3.target && electionContractV3.target !== "0x0000000000000000000000000000000000000000") {
    electionContractV3.on("VoteCast", async (voter, candidateId, event) => {
      console.log(`🗳️ Vote detected from ${voter} for candidate ${candidateId}`);
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

        emitEvent({
          eventName: "VoteCast",
          txHash: event?.transactionHash || null,
          blockNumber: event?.blockNumber || null,
          args: { voter, candidateId: Number(candidateId) },
        });

        broadcastResults();
      } catch (err) {
        console.error("Vote sync error:", err.message);
      }
    });

    electionContractV3.on("CandidateRegistered", async (id, candidateAddr, name, position, imageCID, event) => {
      console.log(`👤 Candidate registered on-chain: ${name} (ID: ${id}, wallet: ${candidateAddr}, position: ${position})`);
      try {
        const posName = position === 0 ? "President" : position === 1 ? "Secretary" : "General Member";
        const cid = imageCID || null;

        const studentRes = await db.query(
          `SELECT student_id, name, year, gender FROM students WHERE LOWER(wallet_address) = LOWER($1)`,
          [candidateAddr]
        );

        if (studentRes.rows.length > 0) {
          const student = studentRes.rows[0];
          const updateRes = await db.query(
            `UPDATE candidates
             SET blockchain_id = $1, status = 'approved', name = $2, position = $3, image_cid = COALESCE(NULLIF($4, ''), image_cid), updated_at = NOW()
             WHERE applied_by = $5 AND (blockchain_id IS NULL OR blockchain_id = $1)
             RETURNING id`,
            [Number(id), name, posName, cid, student.student_id]
          );

          if (updateRes.rows.length > 0) {
            console.log(`   → Linked on-chain ID ${id} to existing candidate record for ${student.student_id}`);
          } else {
            await db.query(
              `INSERT INTO candidates (name, student_id, position, image_cid, blockchain_id, vote_count, status, year, gender, applied_by)
               VALUES ($1, $2, $3, $4, $5, 0, 'approved', $6, $7, $8)`,
              [name, student.student_id, posName, cid, Number(id), student.year, student.gender, student.student_id]
            );
            console.log(`   → Created new candidate record for ${student.student_id} from on-chain event`);
          }
        } else {
          await db.query(
            `INSERT INTO candidates (name, student_id, position, image_cid, blockchain_id, vote_count, status)
             VALUES ($1, NULL, $2, $3, $4, 0, 'approved')
             ON CONFLICT (blockchain_id)
             DO UPDATE SET name = $1, position = $2, image_cid = COALESCE(NULLIF($3, ''), candidates.image_cid), status = 'approved', updated_at = NOW()`,
            [name, posName, cid, Number(id)]
          );
          console.log(`   → No matching student for wallet ${candidateAddr}, created orphan candidate record`);
        }

        emitEvent({
          eventName: "CandidateRegistered",
          txHash: event?.transactionHash || null,
          blockNumber: event?.blockNumber || null,
          args: { id: Number(id), candidate: candidateAddr, name, position: Number(position), imageCID: cid },
        });

        broadcastResults();
      } catch (err) {
        console.error("Candidate sync error:", err.message);
      }
    });

    electionContractV3.on("NewElectionStarted", async (newElectionId, event) => {
      console.log(`🏁 New election started — ID: ${newElectionId}, snapshotting previous results`);

      try {
        const snapshotRes = await db.query(
          `SELECT name, position, vote_count FROM candidates WHERE status = 'approved' ORDER BY position, vote_count DESC`
        );

        if (snapshotRes.rows.length > 0) {
          const electionNum = Number(newElectionId) - 1;
          for (const row of snapshotRes.rows) {
            await db.query(
              `INSERT INTO election_history (election_number, candidate_name, candidate_position, vote_count)
               VALUES ($1, $2, $3, $4)`,
              [electionNum, row.name, row.position, row.vote_count]
            );
          }
          console.log(`   → Snapshot saved for election #${electionNum} (${snapshotRes.rows.length} candidates)`);
        }

        emitEvent({
          eventName: "NewElectionStarted",
          txHash: event?.transactionHash || null,
          blockNumber: event?.blockNumber || null,
          args: { electionId: Number(newElectionId) },
        });
      } catch (err) {
        console.error("Snapshot error:", err.message);
      }
    });
  }
}
