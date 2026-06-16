import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "../config";

const ABI = [
  "function startRegistration()",
  "function startElection()",
  "function endElection()",
  "function getCandidate(uint256) view returns (tuple(uint256 id,string name,string studentId,uint8 year,bool isFemale,string imageCID,uint8 position,uint256 voteCount,bool exists))"
];

async function getContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

// START REGISTRATION
export async function startRegistration() {
  const contract = await getContract();
  const tx = await contract.startRegistration();
  return await tx.wait();
}

// START VOTING
export async function startElection() {
  const contract = await getContract();
  const tx = await contract.startElection();
  return await tx.wait();
}

// END ELECTION
export async function endElection() {
  const contract = await getContract();
  const tx = await contract.endElection();
  return await tx.wait();
}