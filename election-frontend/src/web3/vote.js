import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../config";

// Minimal ABI (only vote function)
const ABI = [
  "function vote(uint256 _presidentId, uint256 _secretaryId, uint256[] _memberIds)"
];

export async function castVote(presidentId, secretaryId, memberIds) {
  try {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }

    // 1. Connect wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 2. Connect contract
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ABI,
      signer
    );

    // 3. Send transaction
    const tx = await contract.vote(
      presidentId,
      secretaryId,
      memberIds
    );

    console.log("Transaction sent:", tx.hash);

    // 4. Wait confirmation
    const receipt = await tx.wait();

    console.log("Vote confirmed:", receipt);

    return receipt;

  } catch (err) {
    console.error("Voting failed:", err);
  }
}