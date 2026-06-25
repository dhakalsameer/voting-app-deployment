import { ethers } from "ethers";
import { CONTRACT_ADDRESS_V3 } from "../config";

const ABI = [
  "function startRegistration(uint256 _end)",
  "function startVoting(uint256 _end)",
  "function endElection()",
  "function getCandidate(uint256) view returns (tuple(uint256 id,string name,string studentId,uint8 year,bool isFemale,string imageCID,uint8 position,uint256 voteCount,bool exists))",
  "function getPhase() view returns (uint8)",
  "function votingEnd() view returns (uint256)",
  "function registrationEnd() view returns (uint256)"
];

async function getContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(CONTRACT_ADDRESS_V3, ABI, signer);
}

export async function startRegistration(endTimestamp) {
  const contract = await getContract();
  const tx = await contract.startRegistration(endTimestamp);
  return await tx.wait();
}

export async function startVoting(endTimestamp) {
  const contract = await getContract();
  const tx = await contract.startVoting(endTimestamp);
  return await tx.wait();
}

export async function endElection() {
  const contract = await getContract();
  const tx = await contract.endElection();
  return await tx.wait();
}
