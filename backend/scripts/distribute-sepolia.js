#!/usr/bin/env node
/**
 * distribute-sepolia.js
 *
 * Batch-distributes Sepolia ETH to eligible voter wallets from the database,
 * grouped by academic year. Supports dry-run by default — pass --execute
 * to actually broadcast transactions.
 *
 * Usage:
 *   node scripts/distribute-sepolia.js --dry-run           # preview only (default)
 *   node scripts/distribute-sepolia.js --execute           # actually send
 *   node scripts/distribute-sepolia.js --execute --year 3  # only Year 3
 *   node scripts/distribute-sepolia.js --amount 0.003       # override 0.002 ETH
 *
 * Prerequisites:
 *   - RPC_URL, PRIVATE_KEY, DATABASE_URL in backend/.env
 *   - Students have wallet_address filled in the database
 *   - Admin wallet has enough Sepolia ETH
 */

import { ethers } from "ethers";
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = !args.includes("--execute");
const filterYear = parseFlag(args, "--year");
const amountFlag = parseFlag(args, "--amount");
const REPORT_DIR = path.resolve(__dirname, "../reports");

function parseFlag(argv, flag) {
  const idx = argv.indexOf(flag);
  return idx !== -1 ? argv[idx + 1] : null;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const AMOUNT_PER_VOTER_ETH = amountFlag ? amountFlag : "0.002";
const AMOUNT_PER_VOTER_WEI = ethers.parseEther(AMOUNT_PER_VOTER_ETH);
const MIN_BALANCE_BUFFER = ethers.parseEther("0.01"); // keep some admin gas reserve
const RECONFIRM_COUNT = 5; // prompt Y/N if >5 recipients
const SLEEP_MS_BETWEEN_TX = 2000; // 2s delay between transfers (rate-limit friendly)

// ─── Startup validation ───────────────────────────────────────────────────────
if (!process.env.RPC_URL) {
  console.error("❌ RPC_URL missing in .env");
  process.exit(1);
}
if (!process.env.PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY missing in .env");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing in .env");
  process.exit(1);
}

// ─── Ethers setup ─────────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ─── DB setup ─────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        Sepolia ETH Batch Distribution Script                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Admin wallet: ${wallet.address}`);
  console.log(`Mode:         ${isDryRun ? "🧪 DRY RUN (no tx sent)" : "🔥 LIVE — transactions will be broadcast"}`);
  console.log(`Amount/voter: ${AMOUNT_PER_VOTER_ETH} ETH (${AMOUNT_PER_VOTER_WEI.toString()} wei)`);
  if (filterYear) console.log(`Year filter:  ${filterYear}`);
  console.log("─".repeat(64));

  // ── Step 1: fetch eligible wallets from DB ─────────────────────────────────
  const students = await fetchStudents();
  if (students.length === 0) {
    console.log("\n⚠️  No students with wallet_address found in database.");
    console.log("   Tip: Students must connect their wallet via the portal first.");
    process.exit(0);
  }

  const byYear = groupByYear(students);
  const distinctYears = Object.keys(byYear).sort();
  const totalRecipients = students.length;
  const totalNeededWei = AMOUNT_PER_VOTER_WEI * BigInt(totalRecipients);

  // ── Step 2: report distribution plan ───────────────────────────────────────
  console.log(`\n📋 Distribution Plan (${totalRecipients} recipients)\n`);
  console.log(`${"Year".padEnd(10)} ${"Count".padStart(8)} ${"Total ETH".padStart(14)}`);
  console.log("─".repeat(40));
  for (const yr of distinctYears) {
    const count = byYear[yr].length;
    const sub = ethers.formatEther(AMOUNT_PER_VOTER_WEI * BigInt(count));
    console.log(`${yr.padEnd(10)} ${String(count).padStart(8)} ${sub.padStart(14)}`);
  }
  console.log("─".repeat(40));
  console.log(`${"TOTAL".padStart(18)} ${totalRecipients.toString().padStart(8)} ${ethers.formatEther(totalNeededWei).padStart(14)}`);

  // ── Step 3: balance check ──────────────────────────────────────────────────
  const balance = await provider.getBalance(wallet.address);
  const neededWithBuffer = totalNeededWei + MIN_BALANCE_BUFFER;

  console.log(`\n💰 Admin balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`   Required:      ${ethers.formatEther(totalNeededWei)} ETH (+ ${ethers.formatEther(MIN_BALANCE_BUFFER)} buffer)`);

  if (balance < neededWithBuffer) {
    const shortfall = neededWithBuffer - balance;
    console.error(`\n❌ Insufficient balance. Shortfall: ${ethers.formatEther(shortfall)} ETH`);
    console.error("   Get more Sepolia ETH from https://sepolia-faucet.pk910.de/");
    process.exit(1);
  }

  // ── Step 4: confirm if many recipients ─────────────────────────────────────
  if (!isDryRun && totalRecipients >= RECONFIRM_COUNT) {
    const ok = await promptConfirm(
      `\nYou are about to send ${totalRecipients} transactions totalling ${ethers.formatEther(totalNeededWei)} ETH. Continue? (yes/no): `
    );
    if (!ok) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  // ── Step 5: distribute year-by-year ────────────────────────────────────────
  const logEntries = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const yr of distinctYears) {
    const group = byYear[yr];
    console.log(`\n🎓 Year ${yr} — ${group.length} recipient(s)`);
    console.log("─".repeat(40));

    for (const student of group) {
      const { student_id, name, wallet_address } = student;
      const label = `${name} (${student_id})`.substring(0, 36).padEnd(36);

      if (isDryRun) {
        console.log(`  [DRY]  ${label} → ${wallet_address}  ${AMOUNT_PER_VOTER_ETH} ETH`);
        logEntries.push({
          student_id,
          name,
          wallet_address,
          year: yr,
          amount_eth: AMOUNT_PER_VOTER_ETH,
          tx_hash: null,
          status: "dry-run",
          error: null,
        });
        continue;
      }

      // LIVE mode
      try {
        const tx = await wallet.sendTransaction({
          to: wallet_address,
          value: AMOUNT_PER_VOTER_WEI,
        });
        console.log(`  [SENT] ${label} → ${tx.hash}`);

        // wait for receipt
        const receipt = await tx.wait();
        const status = receipt?.status === 1 ? "success" : "reverted";

        logEntries.push({
          student_id,
          name,
          wallet_address,
          year: yr,
          amount_eth: AMOUNT_PER_VOTER_ETH,
          tx_hash: tx.hash,
          status,
          error: status === "reverted" ? "Transaction reverted" : null,
        });
        if (status === "success") sentCount++;
        else failedCount++;
      } catch (err) {
        console.error(`  [FAIL] ${label} → ${err.message}`);
        logEntries.push({
          student_id,
          name,
          wallet_address,
          year: yr,
          amount_eth: AMOUNT_PER_VOTER_ETH,
          tx_hash: null,
          status: "failed",
          error: err.message,
        });
        failedCount++;
      }

      // polite pacing
      if (group.indexOf(student) < group.length - 1) {
        await sleep(SLEEP_MS_BETWEEN_TX);
      }
    }
  }

  // ── Step 6: persist results ────────────────────────────────────────────────
  await saveReport(logEntries, distinctYears, totalRecipients);
  if (!isDryRun) {
    await persistToDb(logEntries);
  }

  // ── Step 7: summary ────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(64));
  console.log("                        SUMMARY");
  console.log("═".repeat(64));
  if (isDryRun) {
    console.log("✅ Dry run complete. No transactions broadcast.");
    console.log(`   Use --execute to actually send ${totalRecipients} transfers.`);
  } else {
    console.log(`Sent:    ${sentCount} ✅`);
    console.log(`Failed:  ${failedCount} ❌`);
    console.log(`Report:  ${REPORT_DIR}/distribution-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  }
  console.log("═".repeat(64));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchStudents() {
  const client = await pool.connect();
  try {
    let sql = `
      SELECT student_id, name, wallet_address, year
      FROM students
      WHERE wallet_address IS NOT NULL
        AND wallet_address != ''
    `;
    const params = [];
    if (filterYear) {
      sql += ` AND year = $1 `;
      params.push(filterYear);
    }
    sql += ` ORDER BY year, student_id `;

    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

function groupByYear(rows) {
  const map = {};
  for (const r of rows) {
    const yr = r.year || "Unknown";
    if (!map[yr]) map[yr] = [];
    map[yr].push(r);
  }
  return map;
}

async function promptConfirm(question) {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

async function saveReport(entries, years, totalRecipients) {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

  const now = new Date();
  const filename = `distribution-${now.toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(REPORT_DIR, filename);

  const report = {
    meta: {
      timestamp: now.toISOString(),
      mode: isDryRun ? "dry-run" : "live",
      admin_address: wallet.address,
      amount_per_voter_eth: AMOUNT_PER_VOTER_ETH,
      years: years,
      total_recipients: totalRecipients,
      rpc_url: maskRpcUrl(process.env.RPC_URL),
    },
    results: entries,
  };

  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n📝 Report saved: ${filePath}`);
}

async function persistToDb(entries) {
  const client = await pool.connect();
  try {
    // Ensure table exists (safe to run even if already present)
    await client.query(`
      CREATE TABLE IF NOT EXISTS distribution_log (
        id              SERIAL PRIMARY KEY,
        student_id      TEXT NOT NULL REFERENCES students(student_id),
        wallet_address  TEXT NOT NULL,
        amount_eth      TEXT NOT NULL,
        tx_hash         TEXT,
        status          TEXT NOT NULL,
        error           TEXT,
        distributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const e of entries) {
      await client.query(
        `INSERT INTO distribution_log
         (student_id, wallet_address, amount_eth, tx_hash, status, error)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [e.student_id, e.wallet_address, e.amount_eth, e.tx_hash, e.status, e.error]
      );
    }
    console.log(`🗄️  Persisted ${entries.length} record(s) to distribution_log.`);
  } catch (err) {
    console.error("⚠️  DB persistence failed:", err.message);
  } finally {
    client.release();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskRpcUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // mask API key portion
    if (u.pathname.length > 1) {
      const parts = u.pathname.split("/");
      if (parts[parts.length - 1]) {
        parts[parts.length - 1] = "***";
        u.pathname = parts.join("/");
      }
    }
    return u.toString();
  } catch {
    return url.replace(/\/v2\/.+$/, "/v2/***");
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
main()
  .catch((err) => {
    console.error("\n💥 Fatal error:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
