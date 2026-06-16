import { ethers } from "ethers";
import dotenv from "dotenv";
import ElectionABI from "../abi/Election.json" with { type: "json" };

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

export const adminSigner = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

export const electionContract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  ElectionABI.abi,
  adminSigner
);
