import dotenv from "dotenv";
dotenv.config();
console.log("PK:", process.env.PRIVATE_KEY ? "SET: " + process.env.PRIVATE_KEY.substring(0, 20) : "UNDEFINED");
import { ethers } from "ethers";
try {
  const w = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log("Wallet OK:", w.address);
} catch(e) {
  console.log("WALLET ERROR:", e.message.substring(0, 200));
}

import { electionContractV3, adminSigner } from "./src/blockchain/electionContract.js";
console.log("Admin signer:", adminSigner.address);
console.log("Contract:", electionContractV3.target);
