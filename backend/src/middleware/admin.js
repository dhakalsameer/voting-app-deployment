import { electionContractV3 } from "../blockchain/electionContract.js";

function compareAddresses(a, b) {
  if (!a || !b) return false;
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  if (sa.length !== sb.length) return false;
  let ok = true;
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) ok = false;
  }
  return ok;
}

export async function verifyAdmin(req, res, next) {
  const adminWallet = req.body?.adminWallet || req.query?.adminWallet;

  if (!adminWallet) {
    return res.status(401).json({ error: "Admin wallet address is required" });
  }

  try {
    const onChainAdmin = await electionContractV3.admin();
    if (!compareAddresses(adminWallet, onChainAdmin)) {
      return res.status(403).json({ error: "Unauthorized: caller is not the contract admin" });
    }
    next();
  } catch (err) {
    console.error("Admin verification error:", err);
    return res.status(500).json({ error: "Admin verification failed" });
  }
}
