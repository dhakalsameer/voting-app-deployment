import { useState, useEffect } from "react";

export default function Results() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/results");
        const data = await res.json();
        if (Array.isArray(data)) {
          setCandidates(data);
        }
      } catch (err) {
        console.error("Failed to fetch results", err);
      }
    };

    fetchResults();
    const interval = setInterval(fetchResults, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Live Results</h2>
      <div className="space-y-4">
        {candidates.length > 0 ? candidates.map((c) => (
          <div key={c.id} className="flex justify-between items-center border-b pb-2">
            <div>
              <span className="font-semibold">{c.name}</span>
              <span className="ml-2 text-sm text-gray-500 uppercase tracking-wide">({c.position})</span>
            </div>
            <span className="font-bold text-blue-600">{c.vote_count} votes</span>
          </div>
        )) : (
          <p className="text-gray-500">No results available yet.</p>
        )}
      </div>
    </div>
  );
}
