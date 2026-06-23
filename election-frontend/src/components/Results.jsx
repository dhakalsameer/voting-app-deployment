import { useState, useEffect } from "react";
import { API_URL } from "../config";
import { socket } from "../socket";

export default function Results() {
  const [candidates, setCandidates] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchResults = async () => {
    try {
      const res = await fetch(`${API_URL}/api/results`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCandidates(data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch results", err);
    }
  };

  useEffect(() => {
    fetchResults();

    // 🔥 Real-time Listener
    socket.on("voteUpdate", (data) => {
      console.log("⚡ Real-time vote update received");
      setCandidates(data);
      setLastUpdate(new Date());
    });

    const interval = setInterval(fetchResults, 30000); // Poll less frequently as fallback
    
    return () => {
      socket.off("voteUpdate");
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="glass-panel rounded-3xl shadow-card border border-app overflow-hidden animate-in fade-in duration-500">
      <div className="bg-app-elevated px-6 py-4 border-b border-app flex justify-between items-center">
        <h2 className="font-black text-sm text-sky-300 uppercase tracking-widest flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
          </span>
          Live Results
        </h2>
        <span className="text-xs font-mono text-app-muted">
          Sync: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>
      
      <div className="p-6 space-y-5">
        {candidates.length > 0 ? (
          candidates.map((c) => {
            const totalVotes = candidates.reduce((acc, curr) => acc + Number(curr.vote_count), 0);
            const percentage = totalVotes > 0 ? (Number(c.vote_count) / totalVotes * 100).toFixed(1) : 0;
            
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="min-w-0">
                    <p className="font-bold text-app-heading text-base truncate">{c.name}</p>
                    <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">{c.position}</p>
                  </div>
                  <div className="text-right min-w-0">
                    <p className="font-black text-app-heading text-base">{c.vote_count}</p>
                    <p className="text-xs font-mono font-bold text-app-muted uppercase">{percentage}%</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-app-muted border border-app rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-300 via-emerald-500 to-sky-400 shadow-neon-glow transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-app-muted font-mono italic animate-pulse">Awaiting network ballot sync...</p>
          </div>
        )}
      </div>
      
      <div className="bg-app-elevated/60 px-6 py-4 border-t border-app">
        <button
          onClick={() => {
            const el = document.getElementById("analytics-report");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="w-full text-xs font-black uppercase tracking-widest text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
        >
          View Detailed Analytics →
        </button>
      </div>
    </div>
  );
}
