import { useState } from "react";
import { uploadToIPFS } from "../../web3/ipfs";
import { getContract } from "../../contract";

export default function RegisterCandidate() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [year, setYear] = useState(4);
  const [isFemale, setIsFemale] = useState(false);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!file || !name || !studentId) return alert("Please fill all fields");
    
    setLoading(true);
    try {
      // 1. Upload image to IPFS
      const cid = await uploadToIPFS(file);

      // 2. Get Contract
      const contract = await getContract();

      // 3. Register candidate
      const tx = await contract.registerCandidate(
        name,
        studentId,
        year,
        isFemale,
        cid,
        position
      );

      await tx.wait();
      alert("Candidate Registered!");
    } catch (err) {
      console.error("Registration error:", err);
      alert(err.reason || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Register Candidate</h3>

      <div className="flex flex-col gap-3">
        <input 
          className="p-2 border rounded"
          placeholder="Full Name" 
          onChange={(e) => setName(e.target.value)} 
        />
        <input 
          className="p-2 border rounded"
          placeholder="Student ID" 
          onChange={(e) => setStudentId(e.target.value)} 
        />
        <div className="flex gap-4">
          <select 
            className="p-2 border rounded flex-1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value={1}>Year 1</option>
            <option value={2}>Year 2</option>
            <option value={3}>Year 3</option>
            <option value={4}>Year 4</option>
          </select>
          <select 
            className="p-2 border rounded flex-1"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
          >
            <option value={0}>President</option>
            <option value={1}>Secretary</option>
            <option value={2}>General Member</option>
          </select>
        </div>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={isFemale}
            onChange={(e) => setIsFemale(e.target.checked)}
          />
          Female Candidate
        </label>

        <input 
          type="file" 
          className="p-2 border rounded bg-gray-50"
          onChange={(e) => setFile(e.target.files[0])} 
        />

        <button 
          onClick={handleRegister}
          disabled={loading}
          className="bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? "Registering..." : "Register Candidate"}
        </button>
      </div>
    </div>
  );
}