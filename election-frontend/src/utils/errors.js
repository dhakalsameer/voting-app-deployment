const CONTRACT_ERRORS = {
  "Not eligible voter": "You are not whitelisted as a voter. Contact the admin to be verified.",
  "Identity not verified": "Your identity could not be verified on-chain. Contact the admin to ensure you are whitelisted.",
  "Already voted": "You have already cast your vote. Each voter can only vote once per election.",
  "Voting ended": "The voting period has ended. You can no longer cast your vote.",
  "Invalid candidate": "The selected candidate is no longer valid. Please try refreshing the page.",
  "Invalid president": "Invalid president selection. Please choose a valid candidate.",
  "Invalid secretary": "Invalid secretary selection. Please choose a valid candidate.",
  "Invalid GM": "Invalid general member selection. Please choose valid candidates.",
  "Not admin": "Only the contract admin can perform this action.",
  "Wrong phase": "This action is not available in the current election phase.",
  "Not ready": "Candidate registration is not yet ready. Wait for the admin to open registration.",
  "Registration ended": "Candidate registration has ended. You can no longer register.",
  "Already registered": "This candidate ID has already been registered by someone else.",
  "President must be 4th year": "Only 4th-year students can run for President.",
  "Secretary must be 3rd or 4th year": "Only 3rd or 4th-year students can run for Secretary.",
  "Too many GM votes": "You can vote for a maximum of 5 General Members.",
  "Need at least 2 female GM votes": "You must vote for at least 2 female General Members.",
  "No candidates selected": "You must select at least one candidate to vote for.",
  "No candidates": "There are no candidates registered for this election.",
  "Invalid GM ID": "Invalid general member ID. Please refresh the page.",
  "Need at least 5 GM candidates": "There must be at least 5 General Member candidates to hold the election.",
  "Need at least 2 female GM candidates": "There must be at least 2 female General Member candidates.",
  "Invalid phase": "Cannot start a new election in the current phase. End the current election first.",
  "End must be in future": "The end time must be set in the future.",
  "Registration period not over": "The registration period is still active. Wait for it to complete.",
  "Voting period not over": "The voting period is still active. Wait for it to complete.",
  "Registration not open": "Candidate registration is not currently open.",
  "Voting not open": "Voting is not currently active.",
  "Already registered on-chain": "This wallet has already registered as a candidate.",
  "Duplicate member vote": "You cannot vote for the same General Member twice.",
  "Must select 7 members": "You must select exactly 7 General Members.",
};

function extractContractReason(err) {
  return err?.reason || err?.shortMessage || err?.message || "";
}

export function formatContractError(err, fallback = "Transaction failed") {
  const raw = extractContractReason(err);

  for (const [key, msg] of Object.entries(CONTRACT_ERRORS)) {
    if (raw.includes(key)) return msg;
  }

  if (raw.includes("user rejected") || raw.includes("User denied")) {
    return "Transaction was cancelled.";
  }

  if (raw.includes("insufficient funds")) {
    return "Insufficient funds to pay for gas. Please add ETH to your wallet.";
  }

  if (raw.includes("execution reverted") && raw.length < 120) {
    const match = raw.match(/reason="([^"]+)"/);
    if (match) {
      for (const [key, msg] of Object.entries(CONTRACT_ERRORS)) {
        if (match[1].includes(key)) return msg;
      }
      return match[1];
    }
  }

  return fallback;
}

export function formatAPIError(err, fallback = "Request failed") {
  if (!err) return fallback;
  if (err.code === "ACTION_REJECTED" || err.code === 4001) {
    return "Signature was cancelled. You must sign the message to verify your wallet.";
  }
  const msg = err?.message || "";
  if (msg.includes("user rejected") || msg.includes("User denied") || msg.includes("ethers-user-denied")) {
    return "Signature was cancelled. You must sign the message to verify your wallet.";
  }
  if (msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return err?.response?.data?.error || err?.message || fallback;
}
