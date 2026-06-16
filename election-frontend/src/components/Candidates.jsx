import { useEffect, useState } from "react";
import { getContract } from "../contract";

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    const contract = await getContract();

    let data = [];

    for (let i = 1; i <= 20; i++) {
      try {
        const candidate = await contract.getCandidate(i);

        data.push(candidate);
      } catch {
        break;
      }
    }

    setCandidates(data);
  }

  return (
    <div>
      <h2>Candidates</h2>

      {candidates.map((c, index) => (
        <div key={index}>
          <h3>{c.name}</h3>

          <p>
            Votes:
            {c.voteCount.toString()}
          </p>
        </div>
      ))}
    </div>
  );
}
