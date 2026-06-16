import { ethers } from "ethers";

const MESSAGE = "Gandaki University Election Wallet Verification";

export async function connectWallet(student_id, token) {
  if (!window.ethereum) {
    alert("MetaMask not installed");
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const walletAddress = await signer.getAddress();

  const signature = await signer.signMessage(MESSAGE);

  const res = await fetch("http://localhost:5000/api/wallet/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      student_id,
      wallet: walletAddress,
      signature,
    }),
  });

  return await res.json();
}
