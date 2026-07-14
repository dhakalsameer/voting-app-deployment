import { db } from "../db.js";

const MAX_EVENTS = 500;

let cache = [];
let loaded = false;

async function loadCache() {
  if (loaded) return;

  const result = await db.query(
    `SELECT id, event_name, tx_hash, block_number, log_index, from_address, election_id, args, timestamp
     FROM events ORDER BY timestamp DESC, id DESC LIMIT $1`,
    [MAX_EVENTS]
  );
  cache = result.rows.map(r => ({
    eventName: r.event_name,
    txHash: r.tx_hash,
    blockNumber: r.block_number,
    logIndex: r.log_index,
    fromAddress: r.from_address,
    electionId: r.election_id ?? 0,
    args: r.args || {},
    timestamp: Number(r.timestamp),
  }));
  loaded = true;
}

export async function addEvent(event) {
  const timestamp = event.timestamp || Math.floor(Date.now() / 1000);
  const args = event.args || {};

  await db.query(
    `INSERT INTO events (event_name, tx_hash, block_number, log_index, from_address, election_id, args, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
    [event.eventName, event.txHash || null, event.blockNumber || null, event.logIndex || null, event.fromAddress || null, event.electionId ?? 0, JSON.stringify(args), timestamp]
  );

  cache.unshift({
    eventName: event.eventName,
    txHash: event.txHash || null,
    blockNumber: event.blockNumber || null,
    logIndex: event.logIndex || null,
    fromAddress: event.fromAddress || null,
    electionId: event.electionId ?? 0,
    args,
    timestamp,
  });
  if (cache.length > MAX_EVENTS) cache.pop();
}

export async function getEvents(limit = 100) {
  await loadCache();
  return cache.slice(0, limit);
}

export async function seedHistoricalEvents() {
  await loadCache();
  if (cache.length > 0) return;

  const entries = [];

  // Generate PhaseChanged events for all phases based on current election state
  let phaseTimestamps = [];
  try {
    const { electionContractV3 } = await import("../blockchain/electionContract.js");
    const currentPhase = Number(await electionContractV3.getPhase());
    const regEnd = Number(await electionContractV3.registrationEnd());
    const voteEnd = Number(await electionContractV3.votingEnd());
    const now = Math.floor(Date.now() / 1000);

    const baseTime = now - 86400; // assume election started ~1 day ago
    phaseTimestamps = [
      { newPhase: 0, ts: baseTime },
    ];
    if (regEnd > 0) {
      phaseTimestamps.push({ newPhase: 1, ts: regEnd - 3600 }); // registration phase starts 1h before it ends
    }
    if (voteEnd > 0) {
      phaseTimestamps.push({ newPhase: 2, ts: voteEnd - 3600 }); // voting phase starts 1h before it ends
    }
    if (currentPhase >= 3) {
      phaseTimestamps.push({ newPhase: 3, ts: now });
    }
    // Deduplicate and sort by timestamp
    phaseTimestamps.sort((a, b) => a.ts - b.ts);
  } catch {
    // Fallback: simple sequence
    const now = Math.floor(Date.now() / 1000);
    phaseTimestamps = [
      { newPhase: 0, ts: now - 86400 },
      { newPhase: 1, ts: now - 43200 },
      { newPhase: 2, ts: now - 3600 },
    ];
  }
  for (const pt of phaseTimestamps) {
    entries.push({
      eventName: "PhaseChanged",
      txHash: null,
      blockNumber: null,
      args: { newPhase: pt.newPhase },
      timestamp: pt.ts,
    });
  }

  // CandidateRegistered from DB candidates
  const candRes = await db.query(
    "SELECT name, position, blockchain_id, image_cid, created_at FROM candidates WHERE blockchain_id IS NOT NULL ORDER BY blockchain_id"
  );
  for (const c of candRes.rows) {
    const ts = c.created_at
      ? Math.floor(new Date(c.created_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
    entries.push({
      eventName: "CandidateRegistered",
      txHash: null,
      blockNumber: null,
      args: { id: c.blockchain_id, name: c.name, position: Number(c.position ?? 2), candidate: null, imageCID: c.image_cid || "" },
      timestamp: ts,
    });
  }

  // VoteCast events are now backfilled from on-chain contract (with real from_address).
  // Synthetic ones are omitted to avoid polluting voter counts.

  // NewElectionStarted from election_history
  const histRes = await db.query(
    "SELECT DISTINCT election_number FROM election_history ORDER BY election_number DESC LIMIT 1"
  );
  if (histRes.rows.length > 0) {
    const lastElectionNum = histRes.rows[0].election_number;
    entries.push({
      eventName: "NewElectionStarted",
      txHash: null,
      blockNumber: null,
      args: { electionId: lastElectionNum + 1 },
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  // Insert in chronological order
  entries.sort((a, b) => a.timestamp - b.timestamp);
  for (const e of entries) {
    await addEvent(e);
  }

  if (entries.length > 0) {
    console.log(`   → Seeded ${entries.length} historical events from DB`);
  }
}
