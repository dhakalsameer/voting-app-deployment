import { useState } from "react";
import { getContract } from "../../contract";

export default function VerifyVoter() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!address) return alert("Please enter a wallet address");
    
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.verifyVoter(address);
      await tx.wait();
      alert("Student verified");
    } catch (err) {
      console.error(err);
      alert("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Verify Student Wallet</h3>
      <div className="flex flex-col gap-2">
        <input
          className="p-2 border rounded"
          placeholder="0xWalletAddress..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button 
          onClick={verify}
          disabled={loading}
          className="bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700 disabled:bg-gray-400"
        >
          {loading ? "Verifying..." : "Verify Student"}
        </button>
      </div>
    </div>
  );
}
