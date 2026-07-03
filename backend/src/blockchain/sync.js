import { ethers } from "ethers";
import { electionContractV3 } from "./electionContract.js";
import { db } from "../db.js";
import { addEvent, seedHistoricalEvents } from "../services/eventStore.js";

const POLL_MS = 10000;
const processedKeys = new Set();
let lastProcessedBlock = 0;

export function startBlockchainSync(io) {
  console.log("🔄 Blockchain sync engine running (Poll-based)...");

  let prevVotes = {};
  let prevPhase = null;
  let prevElectionId = 0;
  let prevCandidateCount = 0;
  let snapshotInProgress = false;
  let lastPolledPhase = null;

  async function emitEvent(event) {
    try {
      await addEvent({ ...event, electionId: prevElectionId });
    } catch (err) {
      console.error("Failed to persist event:", err.message);
    }
    if (io) io.emit("blockchainEvent", event);
  }

  async function fetchAndEmitOnChainEvents() {
    const provider = electionContractV3.runner?.provider;
    if (!provider) return;

    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = lastProcessedBlock > 0 ? lastProcessedBlock : 0;
      if (currentBlock <= fromBlock) return;

      // CandidateRegistered — includes candidate wallet address
      const candLogs = await electionContractV3.queryFilter(
        electionContractV3.filters.CandidateRegistered(),
        fromBlock,
        currentBlock
      );
      for (const log of candLogs) {
        const key = `${log.transactionHash}-${log.index}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        await emitEvent({
          eventName: "CandidateRegistered",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          fromAddress: log.args.candidate,
          args: {
            id: Number(log.args.id),
            name: log.args.name,
            position: Number(log.args.position),
            candidate: log.args.candidate,
            imageCID: log.args.imageCID || "",
          },
        });

        // Upsert candidate record from chain data
        const cand = await electionContractV3.getCandidate(Number(log.args.id));
        if (cand.exists) {
          const id = Number(cand.id);
          const position = positionToString(cand.position);
          await db.query(
            `INSERT INTO candidates (blockchain_id, name, position, vote_count, year, gender, image_cid, status, wallet_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8)
             ON CONFLICT (blockchain_id) WHERE blockchain_id IS NOT NULL
             DO UPDATE SET name = $2, position = $3, vote_count = $4, wallet_address = $8`,
            [
              id, cand.name, position, Number(cand.voteCount),
              String(cand.year), cand.isFemale ? "female" : "male",
              cand.imageCID || null, log.args.candidate,
            ]
          );
          prevVotes[id] = Number(cand.voteCount);
        }
      }

      // VoteCast — includes voter wallet address
      const voteLogs = await electionContractV3.queryFilter(
        electionContractV3.filters.VoteCast(),
        fromBlock,
        currentBlock
      );
      for (const log of voteLogs) {
        const key = `${log.transactionHash}-${log.index}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        await emitEvent({
          eventName: "VoteCast",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          fromAddress: log.args.voter,
          args: {
            voter: log.args.voter,
            candidateId: Number(log.args.candidateId),
          },
        });

        const cid = Number(log.args.candidateId);
        try {
          await db.query(
            `UPDATE candidates SET vote_count = vote_count + 1 WHERE blockchain_id = $1`,
            [cid]
          );
        } catch { /* might not exist yet */ }
        prevVotes[cid] = (prevVotes[cid] || 0) + 1;
      }

      // PhaseChanged — no address arg, get from tx receipt
      const phaseLogs = await electionContractV3.queryFilter(
        electionContractV3.filters.PhaseChanged(),
        fromBlock,
        currentBlock
      );
      for (const log of phaseLogs) {
        const key = `${log.transactionHash}-${log.index}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        let fromAddr = null;
        try {
          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          fromAddr = receipt?.from || null;
        } catch { /* ignore */ }

        await emitEvent({
          eventName: "PhaseChanged",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          fromAddress: fromAddr,
          args: { newPhase: Number(log.args.newPhase) },
        });
      }

      // NewElectionStarted — no address arg
      const electionLogs = await electionContractV3.queryFilter(
        electionContractV3.filters.NewElectionStarted(),
        fromBlock,
        currentBlock
      );
      for (const log of electionLogs) {
        const key = `${log.transactionHash}-${log.index}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        let fromAddr = null;
        try {
          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          fromAddr = receipt?.from || null;
        } catch { /* ignore */ }

        const eid = Number(log.args.electionId);
        const prevElectionNum = eid > 1 ? eid - 1 : eid;
        snapshotInProgress = true;
        await snapshotResults(prevElectionNum);
        await db.query("DELETE FROM candidates");
        snapshotInProgress = false;

        await emitEvent({
          eventName: "NewElectionStarted",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          fromAddress: fromAddr,
          args: { electionId: eid },
        });
      }

      // MerkleRootUpdated — no address arg
      const merkleLogs = await electionContractV3.queryFilter(
        electionContractV3.filters.MerkleRootUpdated(),
        fromBlock,
        currentBlock
      );
      for (const log of merkleLogs) {
        const key = `${log.transactionHash}-${log.index}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        let fromAddr = null;
        try {
          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          fromAddr = receipt?.from || null;
        } catch { /* ignore */ }

        await emitEvent({
          eventName: "MerkleRootUpdated",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          fromAddress: fromAddr,
          args: { newRoot: log.args.newRoot },
        });
      }

      // IdentityMerkleRootUpdated
      const identityLogs = await electionContractV3.queryFilter(
        electionContractV3.filters.IdentityMerkleRootUpdated(),
        fromBlock,
        currentBlock
      );
      for (const log of identityLogs) {
        const key = `${log.transactionHash}-${log.index}`;
        if (processedKeys.has(key)) continue;
        processedKeys.add(key);

        let fromAddr = null;
        try {
          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          fromAddr = receipt?.from || null;
        } catch { /* ignore */ }

        await emitEvent({
          eventName: "IdentityMerkleRootUpdated",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index,
          fromAddress: fromAddr,
          args: { newRoot: log.args.newRoot },
        });
      }

      lastProcessedBlock = currentBlock + 1;
    } catch (err) {
      console.error("queryFilter failed, falling back to polling detection:", err.message);
    }
  }

  async function broadcastResults() {
    if (!io) return;
    try {
      const result = await db.query(
        "SELECT blockchain_id as id, name, position, vote_count FROM candidates ORDER BY vote_count DESC"
      );
      io.emit("voteUpdate", result.rows);
    } catch (err) {
      console.error("Broadcast results error:", err.message);
    }
  }

  function positionToString(pos) {
    if (Number(pos) === 0) return "President";
    if (Number(pos) === 1) return "Secretary";
    return "General Member";
  }

  async function upsertCandidate(cand) {
    const id = Number(cand.id);
    const position = positionToString(cand.position);
    await db.query(
      `INSERT INTO candidates (blockchain_id, name, position, vote_count, year, gender, image_cid, status, wallet_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NULL)
       ON CONFLICT (blockchain_id) WHERE blockchain_id IS NOT NULL
       DO UPDATE SET vote_count = $4, name = $2, position = $3`,
      [
        id,
        cand.name,
        position,
        Number(cand.voteCount),
        String(cand.year),
        cand.isFemale ? "female" : "male",
        cand.imageCID || null,
      ]
    );
    return id;
  }

  async function snapshotResults(electionNum) {
    try {
      await db.query("DELETE FROM election_history WHERE election_number = $1", [electionNum]);
      const snapRes = await db.query(
        `SELECT name, position, vote_count, year, gender, image_cid
         FROM candidates WHERE status = 'approved' ORDER BY position, vote_count DESC`
      );
      if (snapRes.rows.length > 0) {
        for (const row of snapRes.rows) {
          await db.query(
            `INSERT INTO election_history (election_number, candidate_name, candidate_position, vote_count, candidate_year, candidate_gender, candidate_photo)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [electionNum, row.name, row.position, row.vote_count, row.year, row.gender, row.image_cid]
          );
        }
        console.log(`   → Snapshot saved for election #${electionNum} (${snapRes.rows.length} candidates)`);
      }
    } catch (err) {
      console.error("Snapshot error:", err.message);
    }
  }

  async function backfillElectionHistory() {
    try {
      const contractCount = Number(await electionContractV3.historyCount());
      if (contractCount === 0) return;

      const dbRes = await db.query("SELECT COALESCE(MAX(election_number), 0) AS max_eid FROM election_history");
      const dbCount = dbRes.rows[0].max_eid;

      for (let i = dbCount; i < contractCount; i++) {
        const electionNum = i + 1;
        const r = await electionContractV3.getElectionResult(i);
        const timestamp = Number(r.timestamp);
        let inserted = 0;

        const tryInsert = async (id, position) => {
          if (id === 0) return;
          const c = await electionContractV3.getCandidate(id);
          if (!c.exists) return;
          await db.query(
            `INSERT INTO election_history (election_number, candidate_name, candidate_position, vote_count, candidate_year, candidate_gender, candidate_photo, snapshot_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8))`,
            [electionNum, c.name, position, Number(c.voteCount), String(c.year), c.isFemale ? "female" : "male", c.imageCID || null, timestamp]
          );
          inserted++;
        };

        await tryInsert(Number(r.presidentWinnerId), "President");
        await tryInsert(Number(r.secretaryWinnerId), "Secretary");

        for (const gid of r.generalMemberWinnerIds.map(Number)) {
          if (gid === 0) continue;
          await tryInsert(gid, "General Member");
        }

        if (inserted > 0) {
          console.log(`   → Backfilled election #${electionNum} from contract (${inserted} winners)`);
        }
      }
    } catch (err) {
      console.error("Backfill error:", err.message);
    }
  }

  async function checkPhase() {
    try {
      const phase = Number(await electionContractV3.getPhase());
      const eid = Number(await electionContractV3.currentElectionId());

      const newElectionDetected =
        (prevPhase !== null && prevPhase === 3 && phase === 0) ||
        (prevElectionId > 0 && eid > prevElectionId);

      if (newElectionDetected) {
        const prevElectionNum = eid - 1;
        console.log(`🏁 New election detected (ID: ${eid}), snapshotting election #${prevElectionNum}`);
        snapshotInProgress = true;
        await snapshotResults(prevElectionNum);
        await db.query("DELETE FROM candidates");
        prevVotes = {};
        prevCandidateCount = 0;
        snapshotInProgress = false;
        // queryFilter will emit the real event with fromAddress
      }
      if (lastPolledPhase !== phase) {
        // Snapshot from candidates table when election ends (phase 3)
        if (phase === 3 && prevElectionId > 0) {
          await snapshotResults(prevElectionId);
        }
        await emitEvent({
          eventName: "PhaseChanged",
          txHash: null,
          blockNumber: null,
          fromAddress: null,
          args: { newPhase: phase },
        });
        lastPolledPhase = phase;
      }
      prevPhase = phase;
      prevElectionId = eid;
    } catch (err) {
      console.error("Phase check error:", err.message);
    }
  }

  async function syncAll() {
    try {
      if (snapshotInProgress) return;

      // 1. Fetch real on-chain events (includes wallet addresses)
      await fetchAndEmitOnChainEvents();

      // 2. Poll-based candidate/vote detection as fallback
      const provider = electionContractV3.runner?.provider;
      if (!provider) return;

      const cc = Number(await electionContractV3.candidateCount());
      let anyChange = false;

      for (let i = 1; i <= cc; i++) {
        const cand = await electionContractV3.getCandidate(i);
        if (!cand.exists) continue;

        const id = Number(cand.id);
        const onChainVotes = Number(cand.voteCount);
        const isNew = !(id in prevVotes);
        const prev = prevVotes[id] || 0;

        await upsertCandidate(cand);

        if (isNew) {
          console.log(`📝 New candidate detected: ${cand.name} (${positionToString(cand.position)})`);
          prevVotes[id] = onChainVotes;
        }

        if (onChainVotes !== prev) {
          anyChange = true;
          const diff = onChainVotes - prev;

          if (diff > 0) {
            console.log(`🗳️ ${cand.name} gained ${diff} vote(s) (now ${onChainVotes})`);
          }

          await db.query(
            `UPDATE candidates SET vote_count = $1 WHERE blockchain_id = $2`,
            [onChainVotes, id]
          );

          prevVotes[id] = onChainVotes;
        }
      }

      if (prevCandidateCount !== cc) {
        anyChange = true;
        prevCandidateCount = cc;
      }

      if (anyChange) {
        broadcastResults();
      }
    } catch (err) {
      console.error("Sync error:", err.message);
    }
  }

  if (
    electionContractV3.target &&
    electionContractV3.target !== "0x0000000000000000000000000000000000000000"
  ) {
    (async () => {
      try {
        prevPhase = Number(await electionContractV3.getPhase());
        lastPolledPhase = prevPhase;
        prevElectionId = Number(await electionContractV3.currentElectionId());
        prevCandidateCount = Number(await electionContractV3.candidateCount());

        const provider = electionContractV3.runner?.provider;
        if (provider) {
          lastProcessedBlock = await provider.getBlockNumber();
        }

        if (prevPhase === 0 && prevCandidateCount === 0) {
          const existing = await db.query("SELECT COUNT(*)::int AS cnt FROM candidates");
          if (existing.rows[0].cnt > 0) {
            const prevElectionNum = prevElectionId > 0 ? prevElectionId - 1 : 0;
            console.log(`📦 Startup: snapshotted ${existing.rows[0].cnt} leftover candidates to election #${prevElectionNum}`);
            await snapshotResults(prevElectionNum);
          }
          await db.query("DELETE FROM candidates");
        }

        for (let i = 1; i <= prevCandidateCount; i++) {
          const cand = await electionContractV3.getCandidate(i);
          if (!cand.exists) continue;
          const id = Number(cand.id);
          const votes = Number(cand.voteCount);
          await upsertCandidate(cand);
          prevVotes[id] = votes;
        }

        const total = Object.values(prevVotes).reduce((a, b) => a + b, 0);
        console.log(`✅ Initial sync — ${prevCandidateCount} candidates, ${total} votes, phase ${prevPhase}`);
        broadcastResults();
        await seedHistoricalEvents();
        await backfillElectionHistory();
      } catch (err) {
        console.error("Initial sync error:", err.message);
      }
    })();

    setInterval(syncAll, POLL_MS);
    setInterval(checkPhase, POLL_MS);
  }
}
