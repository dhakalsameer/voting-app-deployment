import { ethers } from "ethers";
import fs from "fs";

const ABI = JSON.parse(fs.readFileSync("src/abi/Election3.json", "utf8")).abi;
const RPC = process.env.RPC_URL || process.env.SEPOLIA_RPC || "";
const PK = process.env.PRIVATE_KEY || "";
const ADDR = process.env.CONTRACT_ADDRESS_V3 || "";

if (!RPC) {
  console.error("Missing RPC_URL (or SEPOLIA_RPC)");
  process.exit(1);
}
if (!PK) {
  console.error("Missing PRIVATE_KEY");
  process.exit(1);
}
if (!ADDR) {
  console.error("Missing CONTRACT_ADDRESS_V3");
  process.exit(1);
}
if (!PK.startsWith("0x") || PK.length !== 66) {
  console.error("PRIVATE_KEY format invalid (expect 0x + 64 hex)");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PK, provider);
const c = new ethers.Contract(ADDR, ABI, wallet);

async function tx(label, fn) {
  console.log(`\n▶ ${label}`);
  const tx = await fn();
  console.log(`  Tx: ${tx.hash}`);
  const r = await tx.wait();
  console.log(`  Block: ${r.blockNumber}`);
  return r;
}

async function main() {
  // Current state
  let phase = Number(await c.getPhase());
  let bal = await provider.getBalance(wallet.address);
  console.log(`Admin: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(bal)} ETH`);
  console.log(`Phase: ${phase}`);

  if (phase === 0) {
    // Step: Start Registration
    const regEnd = Math.floor(Date.now() / 1000) + 3600;
    await tx("Start Registration (phase 0→1)", () => c.startRegistration(regEnd));
    phase = Number(await c.getPhase());
    console.log(`  Phase: ${phase} ${phase === 1 ? "✅" : "❌"}`);
  }

  if (phase === 1) {
    console.log("\n  ⚠ Cannot register candidates from admin wallet.");
    console.log("  ⚠ Students must connect MetaMask and register themselves.");
    console.log("  ⚠ Skipping to startVoting (will revert since no candidates).");

    // Actually we can still test startVoting, but it requires candidates.
    // Let's check candidate count.
    const cc = Number(await c.candidateCount());
    console.log(`  On-chain candidates: ${cc}`);

    // Since we can't register candidates from CLI, skip to endElection test
    // But first let's verify the PhaseChanged event was synced
  }

  // Just verify the phase change is visible via the API
  console.log("\n=== Checking backend sync ===");
  const pRes = await fetch("http://localhost:5000/api/contract/phase");
  const pData = await pRes.json();
  console.log(`  Contract phase via API: ${pData.phase} (on-chain: ${phase})`);
  console.log(`  Match: ${pData.phase === phase ? "✅" : "❌"}`);

  // Check events endpoint for PhaseChanged
  const eRes = await fetch("http://localhost:5000/api/events");
  const eData = await eRes.json();
  console.log(`  Events in buffer: ${eData.length}`);
  if (eData.length > 0) {
    const ev = eData[0];
    console.log(`  Latest event: ${ev.eventName} (block #${ev.blockNumber})`);
  }

  console.log("\n✅ Admin-flow tests complete.");
  console.log("📝 Manual steps remaining:");
  console.log("  1. Students register on-chain via CandidateSelfRegister.jsx (MetaMask + gas)");
  console.log("  2. Admin clicks 'Start Voting'");
  console.log("  3. Voters vote via VotingPanelV3.jsx (MetaMask + gas)");
  console.log("  4. Admin clicks 'End Election'");
  console.log("  5. Admin clicks 'Start New Election'");
}

  console.log("\n[SECURITY NOTE] Uses PRIVATE_KEY from env. Never commit keys.");
  main().catch(console.error);
