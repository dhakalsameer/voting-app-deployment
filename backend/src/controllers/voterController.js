import { db } from "../db.js";
import { electionContract, electionContractV3 } from "../blockchain/electionContract.js";
import {
  generateMerkleProof,
  generateMerkleRoot,
  generateIdentityMerkleRoot,
  generateIdentityMerkleProof,
} from "../services/merkleService.js";

export const getMe = async (req, res) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({ error: "wallet query parameter is required" });
    }

    const result = await db.query(
      `SELECT student_id, name, wallet_address, wallet_verified, eligible_to_vote
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
    let chainVerified = Boolean(student.eligible_to_vote);
    try {
      // Try V3 first if available
      if (electionContractV3.target) {
        hasVoted = await electionContractV3.hasVoted(wallet);
        // For V3, "verified" means being in the Merkle Tree. 
        // We'll trust the DB's eligible_to_vote for UI hints, 
        // but the contract will enforce it via proof.
        chainVerified = student.eligible_to_vote;
      } else {
        hasVoted = await electionContract.hasVoted(wallet);
        chainVerified = await electionContract.isVerified(wallet);
      }
    } catch (err) {
      console.error("On-chain voter status lookup failed:", err.message);
    }

    const verified = Boolean(chainVerified);

    return res.json({
      student_id: student.student_id,
      name: student.name,
      registered: true,
      walletLinked: Boolean(student.wallet_verified),
      verified,
      canVote: verified && !hasVoted,
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

    // 1. Get all eligible voters to reconstruct the tree
    const result = await db.query(
      `SELECT wallet_address
       FROM students
       WHERE eligible_to_vote = true
         AND wallet_address IS NOT NULL`
    );

    const wallets = result.rows.map(r => r.wallet_address);
    
    // 2. Generate proof for this wallet
    const proof = generateMerkleProof(wallets, wallet);

    return res.json({ proof });
  } catch (error) {
    console.error("getProof error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const bulkVerifyVoters = async (req, res) => {
  try {
    const { student_ids, version = "v1" } = req.body;

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

    // Mark as eligible in DB
    await db.query(
      `UPDATE students
       SET eligible_to_vote = true
       WHERE student_id = ANY($1::text[])`,
      [result.rows.map((row) => row.student_id)]
    );

    let txHash = null;

    if (version === "v3") {
      // For V3, update both Voter and Identity Merkle Roots on chain
      const allEligibleResult = await db.query(
        `SELECT wallet_address, name, year, gender FROM students WHERE eligible_to_vote = true AND wallet_address IS NOT NULL`
      );
      const allWallets = allEligibleResult.rows.map(r => r.wallet_address);
      const root = generateMerkleRoot(allWallets);

      const identities = allEligibleResult.rows.map(r => ({
        address: r.wallet_address,
        name: r.name,
        year: Number(r.year),
        isFemale: r.gender?.toLowerCase() === "female",
      }));
      const identityRoot = generateIdentityMerkleRoot(identities);

      console.log("Updating Voter Merkle Root to:", root);
      console.log("Updating Identity Merkle Root to:", identityRoot);

      const tx1 = await electionContractV3.setMerkleRoot(root);
      await tx1.wait();

      const tx2 = await electionContractV3.setIdentityMerkleRoot(identityRoot);
      const receipt = await tx2.wait();
      txHash = receipt.hash;
    } else {
      // V1 logic
      const walletsToVerify = result.rows.map((row) => row.wallet_address);
      const tx = await electionContract.verifyVoters(walletsToVerify);
      const receipt = await tx.wait();
      txHash = receipt.hash;
    }

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
      `SELECT student_id, wallet_address
       FROM students
       WHERE student_id = $1
         AND wallet_address IS NOT NULL`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student with linked wallet not found" });
    }

    const student = result.rows[0];
    const tx = await electionContract.revokeVoter(student.wallet_address);
    const receipt = await tx.wait();

    await db.query(
      `UPDATE students
       SET eligible_to_vote = false
       WHERE student_id = $1`,
      [student.student_id]
    );

    return res.json({
      success: true,
      student,
      txHash: receipt.hash,
    });
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

    // Fetch this student's identity and all eligible voters
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
      year: Number(r.year),
      isFemale: r.gender?.toLowerCase() === "female",
    }));

    const targetIdentity = {
      address: student.wallet_address,
      name: student.name,
      year: Number(student.year),
      isFemale: student.gender?.toLowerCase() === "female",
    };

    const proof = generateIdentityMerkleProof(identities, targetIdentity);

    return res.json({
      proof,
      identity: {
        name: student.name,
        year: Number(student.year),
        isFemale: targetIdentity.isFemale,
      },
    });
  } catch (error) {
    console.error("getIdentityProof error:", error);
    return res.status(500).json({ error: "Internal server error" });
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
