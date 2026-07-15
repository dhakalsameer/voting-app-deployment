import { ethers } from "ethers";
import { config } from "../config/env.js";
import Election3ABI from "../abi/Election3.json" with { type: "json" };

const fetchRequest = new ethers.FetchRequest(config.rpc);
fetchRequest.timeout = 180_000;
const provider = new ethers.JsonRpcProvider(fetchRequest);

export const adminSigner = new ethers.Wallet(
  config.privateKey,
  provider
);

export const electionContractV3 = new ethers.Contract(
  config.contractV3,
  Election3ABI.abi,
  adminSigner
);

export function getContractAt(address) {
  return new ethers.Contract(address, Election3ABI.abi, provider);
}
