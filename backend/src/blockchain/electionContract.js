import { ethers } from "ethers";
import { config } from "../config/env.js";
import Election3ABI from "../abi/Election3.json" with { type: "json" };

const provider = new ethers.JsonRpcProvider(config.rpc);

export const adminSigner = new ethers.Wallet(
  config.privateKey,
  provider
);

export const electionContractV3 = new ethers.Contract(
  config.contractV3,
  Election3ABI.abi,
  adminSigner
);
