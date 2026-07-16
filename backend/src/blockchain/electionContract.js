import { ethers } from "ethers";
import { config } from "../config/env.js";
import Election3ABI from "../abi/Election3.json" with { type: "json" };

const req = new ethers.FetchRequest(config.rpc);
req.timeout = 180_000;
const alchemyProvider = new ethers.JsonRpcProvider(req);

const fallbackReq = new ethers.FetchRequest(config.rpcFallback);
fallbackReq.timeout = 180_000;
const fallbackProvider = new ethers.JsonRpcProvider(fallbackReq);

const provider = new ethers.FallbackProvider([
  { provider: alchemyProvider, priority: 1, stallTimeout: 12000 },
  { provider: fallbackProvider, priority: 2, stallTimeout: 20000 },
]);

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
