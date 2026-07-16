import { ethers } from "ethers";
import { config } from "../config/env.js";
import Election3ABI from "../abi/Election3.json" with { type: "json" };

function makeProvider(url) {
  if (!url) return null;
  const req = new ethers.FetchRequest(url);
  req.timeout = 180_000;
  return new ethers.JsonRpcProvider(req);
}

const providers = [
  { provider: makeProvider(config.rpc), priority: 1, stallTimeout: 12000 },
  { provider: makeProvider(config.rpc2), priority: 2, stallTimeout: 12000 },
  { provider: makeProvider(config.rpc3), priority: 3, stallTimeout: 12000 },
  { provider: makeProvider(config.rpcFallback), priority: 4, stallTimeout: 20000 },
].filter(p => p.provider);

const provider = new ethers.FallbackProvider(providers);

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
