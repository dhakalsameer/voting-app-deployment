import { ethers } from "ethers";
import { db } from "../db.js";
import { adminSigner } from "../blockchain/electionContract.js";

const DEFAULT_AMOUNT_ETH = "0.002";
const MIN_BALANCE_BUFFER = ethers.parseEther("0.01");

export async function getDistributionStats(req, res) {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(year, 'Unknown') AS year,
        COUNT(*) FILTER (WHERE wallet_address IS NOT NULL AND wallet_address != '') AS wallet_count,
        COUNT(*) FILTER (WHERE wallet_address IS NOT NULL AND wallet_address != '' AND eligible_to_vote = true) AS eligible_count
      FROM students
      GROUP BY year
      ORDER BY year
    `);

    const totalResult = await db.query(`
      SELECT COUNT(*) AS total
      FROM students
      WHERE wallet_address IS NOT NULL AND wallet_address != ''
    `);

    return res.json({
      years: result.rows,
      totalStudentsWithWallet: Number(totalResult.rows[0].total),
    });
  } catch (error) {
    console.error("getDistributionStats error:", error);
    return res.status(500).json({ error: "Failed to load distribution stats" });
  }
}

export async function distributeGas(req, res) {
  try {
    const { years, amount = DEFAULT_AMOUNT_ETH, dryRun = false, adminWallet } = req.body;

    if (!Array.isArray(years) || years.length === 0) {
      return res.status(400).json({ error: "years array is required" });
    }

    const amountWei = ethers.parseEther(String(amount));
    if (amountWei <= 0n) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Fetch students in selected years that have wallets and are eligible to vote
    const result = await db.query(`
      SELECT student_id, name, wallet_address, year
      FROM students
      WHERE year = ANY($1::text[])
        AND wallet_address IS NOT NULL
        AND wallet_address != ''
        AND eligible_to_vote = true
      ORDER BY year, student_id
    `, [years]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No eligible voters found in selected years" });
    }

    const recipients = result.rows;
    const totalNeededWei = amountWei * BigInt(recipients.length);

    // Check admin balance
    const adminBalance = await adminSigner.provider.getBalance(adminSigner.address);
    const neededWithBuffer = totalNeededWei + MIN_BALANCE_BUFFER;

    if (adminBalance < neededWithBuffer) {
      const shortfall = neededWithBuffer - adminBalance;
      return res.status(400).json({
        error: "Insufficient admin balance",
        adminBalance: ethers.formatEther(adminBalance),
        required: ethers.formatEther(totalNeededWei),
        shortfall: ethers.formatEther(shortfall),
      });
    }

    // ── DRY RUN ────────────────────────────────────────────────────────────
    if (dryRun) {
      return res.json({
        dryRun: true,
        mode: "preview",
        adminAddress: adminSigner.address,
        amountPerVoter: amount,
        totalRecipients: recipients.length,
        totalEth: ethers.formatEther(totalNeededWei),
        adminBalance: ethers.formatEther(adminBalance),
        recipients: recipients.map((r) => ({
          student_id: r.student_id,
          name: r.name,
          wallet_address: r.wallet_address,
          year: r.year,
        })),
      });
    }

    // ── LIVE DISTRIBUTION ──────────────────────────────────────────────────
    const results = [];
    let nonce = await adminSigner.provider.getTransactionCount(adminSigner.address, "pending");

    for (const student of recipients) {
      try {
        const tx = await adminSigner.sendTransaction({
          to: student.wallet_address,
          value: amountWei,
          nonce: nonce++,
        });

        // Don't wait for receipt in a loop to avoid blocking too long.
        // Instead, fire-and-collect the hash.
        results.push({
          student_id: student.student_id,
          name: student.name,
          wallet_address: student.wallet_address,
          year: student.year,
          amount_eth: amount,
          tx_hash: tx.hash,
          status: "sent",
          error: null,
        });
      } catch (err) {
        results.push({
          student_id: student.student_id,
          name: student.name,
          wallet_address: student.wallet_address,
          year: student.year,
          amount_eth: amount,
          tx_hash: null,
          status: "failed",
          error: err.message || "Send failed",
        });
      }
    }

    // Persist results to DB (fire-and-forget, don't block response)
    (async () => {
      try {
        for (const entry of results) {
          await db.query(
            `INSERT INTO distribution_log
             (student_id, wallet_address, amount_eth, tx_hash, status, error)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              entry.student_id,
              entry.wallet_address,
              entry.amount_eth,
              entry.tx_hash,
              entry.status,
              entry.error,
            ]
          );
        }
      } catch (dbErr) {
        console.error("DB persistence error:", dbErr.message);
      }
    })();

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return res.json({
      success: true,
      adminAddress: adminSigner.address,
      amountPerVoter: amount,
      totalRecipients: recipients.length,
      totalEth: ethers.formatEther(totalNeededWei),
      adminBalance: ethers.formatEther(adminBalance),
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("distributeGas error:", error);
    return res.status(500).json({
      error: error.message || "Distribution failed",
    });
  }
}

export async function getDistributionSummary(req, res) {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_distributions,
        COUNT(DISTINCT student_id) AS total_students,
        COALESCE(SUM(CASE WHEN status = 'sent' THEN amount_eth::numeric ELSE 0 END), 0) AS total_eth_sent,
        MAX(distributed_at) AS last_distribution
      FROM distribution_log
    `);

    return res.json({
      totalDistributions: Number(result.rows[0].total_distributions),
      totalStudents: Number(result.rows[0].total_students),
      totalEthSent: Number(result.rows[0].total_eth_sent).toFixed(4),
      lastDistribution: result.rows[0].last_distribution,
    });
  } catch (error) {
    console.error("getDistributionSummary error:", error);
    return res.status(500).json({ error: "Failed to load distribution summary" });
  }
}

export async function retryDistribution(req, res) {
  try {
    const { logIds, amount, adminWallet } = req.body;

    if (!Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({ error: "logIds array is required" });
    }

    const amountWei = ethers.parseEther(String(amount || "0.002"));
    if (amountWei <= 0n) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Fetch failed log entries
    const logResult = await db.query(`
      SELECT id, student_id, wallet_address, amount_eth
      FROM distribution_log
      WHERE id = ANY($1::int[]) AND status = 'failed'
    `, [logIds]);

    if (logResult.rows.length === 0) {
      return res.status(400).json({ error: "No failed distributions found for the given IDs" });
    }

    // Check admin balance
    const totalNeededWei = amountWei * BigInt(logResult.rows.length);
    const adminBalance = await adminSigner.provider.getBalance(adminSigner.address);
    const neededWithBuffer = totalNeededWei + MIN_BALANCE_BUFFER;

    if (adminBalance < neededWithBuffer) {
      return res.status(400).json({
        error: "Insufficient admin balance",
        adminBalance: ethers.formatEther(adminBalance),
        required: ethers.formatEther(totalNeededWei),
      });
    }

    const results = [];
    let nonce = await adminSigner.provider.getTransactionCount(adminSigner.address, "pending");

    for (const entry of logResult.rows) {
      try {
        const tx = await adminSigner.sendTransaction({
          to: entry.wallet_address,
          value: amountWei,
          nonce: nonce++,
        });

        results.push({
          logId: entry.id,
          student_id: entry.student_id,
          wallet_address: entry.wallet_address,
          amount_eth: amount,
          tx_hash: tx.hash,
          status: "sent",
          error: null,
        });
      } catch (err) {
        results.push({
          logId: entry.id,
          student_id: entry.student_id,
          wallet_address: entry.wallet_address,
          amount_eth: amount,
          tx_hash: null,
          status: "failed",
          error: err.message || "Retry failed",
        });
      }
    }

    // Persist new log entries
    (async () => {
      try {
        for (const entry of results) {
          await db.query(
            `INSERT INTO distribution_log
             (student_id, wallet_address, amount_eth, tx_hash, status, error)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [entry.student_id, entry.wallet_address, entry.amount_eth, entry.tx_hash, entry.status, entry.error]
          );
        }
      } catch (dbErr) {
        console.error("DB persistence error on retry:", dbErr.message);
      }
    })();

    return res.json({
      success: true,
      totalAttempted: results.length,
      sent: results.filter(r => r.status === "sent").length,
      failed: results.filter(r => r.status === "failed").length,
      results,
    });
  } catch (error) {
    console.error("retryDistribution error:", error);
    return res.status(500).json({ error: error.message || "Retry failed" });
  }
}

export async function getDistributionHistory(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const year = req.query.year;

    let whereClause = "";
    const params = [];
    let paramIndex = 1;

    if (year && year !== "all") {
      whereClause = `WHERE s.year = $${paramIndex}`;
      params.push(year);
      paramIndex++;
    }

    // Use a subquery or join with students table to filter by year
    const countResult = await db.query(
      `SELECT COUNT(*) FROM distribution_log d ${
        year && year !== "all"
          ? `JOIN students s ON d.student_id = s.student_id WHERE s.year = $1`
          : ""
      }`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const queryParams = [...params, limit, offset];
    const result = await db.query(
      `SELECT d.id, d.student_id, d.wallet_address, d.amount_eth, d.tx_hash, d.status, d.error, d.distributed_at${
        year && year !== "all" ? ", s.year" : ""
      }
       FROM distribution_log d
       ${year && year !== "all" ? `JOIN students s ON d.student_id = s.student_id` : ""}
       ${whereClause}
       ORDER BY d.distributed_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return res.json({
      logs: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getDistributionHistory error:", error);
    return res.status(500).json({ error: "Failed to load distribution history" });
  }
}
