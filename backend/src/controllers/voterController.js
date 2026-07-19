import { db } from "../db.js";
import { electionContractV3 } from "../blockchain/electionContract.js";
import {
  generateMerkleProof,
  generateMerkleRoot,
  generateIdentityMerkleRoot,
  generateIdentityMerkleProof,
} from "../services/merkleService.js";
import { emitEvent } from "../socket.js";
import { sendVoterVerifiedEmail } from "../services/emailService.js";

function parseYear(year) {
  if (year == null) return 0;
  const n = parseInt(year, 10);
  return Number.isFinite(n) ? n : 0;
}

export async function rebuildMerkleTrees() {
  const allEligibleResult = await db.query(
    `SELECT wallet_address, name, year, gender FROM students WHERE eligible_to_vote = true AND wallet_address IS NOT NULL`
  );
  const allWallets = allEligibleResult.rows.map(r => r.wallet_address);
  const root = generateMerkleRoot(allWallets);

  const identities = allEligibleResult.rows.map(r => ({
    address: r.wallet_address,
    name: r.name,
    year: parseYear(r.year),
    isFemale: r.gender?.toLowerCase() === "female",
  }));
  const identityRoot = generateIdentityMerkleRoot(identities);

  const phase = Number(await electionContractV3.getPhase());
  const rootsLocked = phase >= 2;

  if (rootsLocked) {
    console.log("Merkle roots locked — skipping on-chain update (phase >= 2)");
    emitEvent("dataChanged", { type: "voters" });
    return null;
  }

  console.log("Updating Voter Merkle Root to:", root);
  const tx1 = await electionContractV3.setMerkleRoot(root);
  await tx1.wait();

  console.log("Updating Identity Merkle Root to:", identityRoot);
  const tx2 = await electionContractV3.setIdentityMerkleRoot(identityRoot);
  const receipt = await tx2.wait();

  emitEvent("dataChanged", { type: "voters" });

  return receipt.hash;
}

export const getMe = async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet query parameter is required" });
    }

    const result = await db.query(
      `SELECT student_id, name, wallet_address, wallet_verified, eligible_to_vote, image_cid
       FROM students
       WHERE LOWER(wallet_address) = LOWER($1)`,
      [wallet]
    );

    if (result.rows.length === 0) {
      return res.json({
        registered: false,
        walletLinked: false,
        verified: false,
        canVote: false,
      });
    }

    const student = result.rows[0];
    let hasVoted = false;
    let votingPhaseActive = false;

    try {
      hasVoted = await electionContractV3.hasVoted(wallet);
      const phase = Number(await electionContractV3.getPhase());
      const votingEnd = Number(await electionContractV3.votingEnd());
      const now = Math.floor(Date.now() / 1000);
      votingPhaseActive = phase === 2 && now < votingEnd;
    } catch (err) {
      console.error("On-chain voter status lookup failed:", err.message);
    }

    return res.json({
      student_id: student.student_id,
      name: student.name,
      image_cid: student.image_cid,
      registered: true,
      walletLinked: Boolean(student.wallet_verified),
      verified: Boolean(student.eligible_to_vote),
      canVote: Boolean(student.eligible_to_vote) && !hasVoted && votingPhaseActive,
      hasVoted,
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getProof = async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet query parameter is required" });
    }

    const result = await db.query(
      `SELECT wallet_address
       FROM students
       WHERE eligible_to_vote = true
         AND wallet_address IS NOT NULL`
    );

    const wallets = result.rows.map(r => r.wallet_address);
    const proof = generateMerkleProof(wallets, wallet);

    return res.json({ proof });
  } catch (error) {
    console.error("getProof error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const bulkVerifyVoters = async (req, res) => {
  try {
    const { student_ids } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: "student_ids array is required" });
    }

    const result = await db.query(
      `SELECT student_id, wallet_address
       FROM students
       WHERE student_id = ANY($1::text[])
         AND wallet_address IS NOT NULL
         AND wallet_verified = true`,
      [student_ids]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "No eligible students found. Ensure wallets are linked and verified first.",
      });
    }

    const phase = Number(await electionContractV3.getPhase());
    if (phase >= 2) {
      return res.status(400).json({
        error: "Cannot verify voters during Voting or later. Merkle roots are locked on-chain. Verify all voters before advancing to phase 2.",
      });
    }

    await db.query(
      `UPDATE students
       SET eligible_to_vote = true
       WHERE student_id = ANY($1::text[])`,
      [result.rows.map((row) => row.student_id)]
    );

    const emailResult = await db.query(
      `SELECT student_id, name, email FROM students
       WHERE student_id = ANY($1::text[]) AND email IS NOT NULL`,
      [result.rows.map((row) => row.student_id)]
    );
    for (const student of emailResult.rows) {
      sendVoterVerifiedEmail({
        email: student.email,
        name: student.name || student.student_id,
      }).catch(() => {});
    }

    const txHash = await rebuildMerkleTrees();

    return res.json({
      success: true,
      verifiedCount: result.rows.length,
      students: result.rows,
      txHash,
    });
  } catch (error) {
    console.error("bulkVerifyVoters error:", error);
    return res.status(500).json({
      error: error.reason || error.message || "Bulk verification failed",
    });
  }
};

export const revokeVoter = async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }

    const result = await db.query(
      `SELECT student_id, wallet_address, eligible_to_vote
       FROM students
       WHERE student_id = $1
         AND wallet_address IS NOT NULL`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student with linked wallet not found" });
    }

    const student = result.rows[0];
    const previousEligible = student.eligible_to_vote;

    await db.query(
      `UPDATE students
       SET eligible_to_vote = false
       WHERE student_id = $1`,
      [student.student_id]
    );

    try {
      const txHash = await rebuildMerkleTrees();
      return res.json({ success: true, student, txHash });
    } catch (err) {
      await db.query(
        `UPDATE students
         SET eligible_to_vote = $1
         WHERE student_id = $2`,
        [previousEligible, student.student_id]
      );
      throw err;
    }
  } catch (error) {
    console.error("revokeVoter error:", error);
    return res.status(500).json({
      error: error.reason || error.message || "Voter revoke failed",
    });
  }
};

export const getIdentityProof = async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet query parameter is required" });
    }

    const studentResult = await db.query(
      `SELECT wallet_address, name, year, gender
       FROM students
       WHERE LOWER(wallet_address) = LOWER($1)
         AND eligible_to_vote = true`,
      [wallet]
    );

    if (studentResult.rows.length === 0) {
      return res.status(403).json({ error: "Student not found or not eligible" });
    }

    const student = studentResult.rows[0];

    const allResult = await db.query(
      `SELECT wallet_address, name, year, gender
       FROM students
       WHERE eligible_to_vote = true
         AND wallet_address IS NOT NULL`
    );

    const identities = allResult.rows.map(r => ({
      address: r.wallet_address,
      name: r.name,
      year: parseYear(r.year),
      isFemale: r.gender?.toLowerCase() === "female",
    }));

    const targetIdentity = {
      address: student.wallet_address,
      name: student.name,
      year: parseYear(student.year),
      isFemale: student.gender?.toLowerCase() === "female",
    };

    const proof = generateIdentityMerkleProof(identities, targetIdentity);

    return res.json({
      proof,
      identity: {
        name: student.name,
        year: parseYear(student.year),
        isFemale: targetIdentity.isFemale,
      },
    });
  } catch (error) {
    console.error("getIdentityProof error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const adminRebuildMerkle = async (_req, res) => {
  try {
    const txHash = await rebuildMerkleTrees();
    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: "Merkle roots are locked on-chain (phase >= 2). On-chain update skipped.",
      });
    }
    return res.json({ success: true, txHash });
  } catch (error) {
    console.error("adminRebuildMerkle error:", error);
    return res.status(500).json({ error: error.reason || error.message || "Rebuild failed" });
  }
};

export const getPendingVoters = async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT student_id, name, wallet_address, wallet_verified, eligible_to_vote
       FROM students
       ORDER BY student_id`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("getPendingVoters error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
