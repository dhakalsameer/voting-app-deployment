import { getContract } from "../../contract";
import { useState } from "react";

export default function ElectionControl() {
  const [loading, setLoading] = useState(false);

  async function startRegistration() {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.startRegistration();
      await tx.wait();
      alert("Registration started");
    } catch (err) {
      console.error(err);
      alert("Error starting registration");
    } finally {
      setLoading(false);
    }
  }

  async function startElection() {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.startElection(60); // Default 60 minutes
      await tx.wait();
      alert("Voting started for 60 minutes");
    } catch (err) {
      console.error(err);
      alert("Error starting election");
    } finally {
      setLoading(false);
    }
  }

  async function endElection() {
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.endElection();
      await tx.wait();
      alert("Election ended");
    } catch (err) {
      console.error(err);
      alert("Error ending election");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Election Control</h3>
      <div className="flex flex-col gap-2">
        <button 
          onClick={startRegistration} 
          disabled={loading}
          className="bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          Start Registration
        </button>

        <button 
          onClick={startElection} 
          disabled={loading}
          className="bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400"
        >
          Start Voting (60m)
        </button>

        <button 
          onClick={endElection} 
          disabled={loading}
          className="bg-red-600 text-white py-2 rounded font-medium hover:bg-red-700 disabled:bg-gray-400"
        >
          End Election
        </button>
      </div>
    </div>
  );
}
