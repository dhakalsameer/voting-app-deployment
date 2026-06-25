import { useState, useEffect, useMemo } from "react";
import { API_URL } from "../config";
import { socket } from "../socket";

const POSITIONS = ["President", "Secretary", "General Member"];

function Bar({ value, max, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-app-heading truncate mr-2">{label}</span>
        <span className="font-mono text-app-muted-text tabular-nums">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-app-border/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PositionGroup({ title, candidates, maxVotes }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted-text">{title}</h4>
      <div className="space-y-2">
        {candidates.map((c) => (
          <Bar key={c.name} label={c.name} value={Number(c.vote_count ?? 0)} max={maxVotes} />
        ))}
      </div>
      {candidates.length === 0 && (
        <p className="text-xs text-app-muted-text italic">No candidates</p>
      )}
    </div>
  );
}

function LiveResults() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(`${API_URL}/api/results`);
        const d = await res.json();
        if (Array.isArray(d)) setData(d);
      } catch {}
    };

    fetchResults();
    socket.on("voteUpdate", setData);
    const interval = setInterval(fetchResults, 30000);

    return () => {
      socket.off("voteUpdate");
      clearInterval(interval);
    };
  }, []);

  const totalVotes = data.reduce((acc, c) => acc + Number(c.vote_count ?? 0), 0);
  const maxVotes = Math.max(...data.map((c) => Number(c.vote_count ?? 0)), 1);

  const grouped = useMemo(() => {
    const g = {};
    for (const c of data) {
      const pos = c.position || "Unknown";
      if (!g[pos]) g[pos] = [];
      g[pos].push(c);
    }
    return g;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-app-muted-text ml-auto">{totalVotes} votes</span>
      </div>
      {data.length > 0 ? (
        <div className="space-y-4">
          {POSITIONS.map((pos) =>
            grouped[pos] ? (
              <PositionGroup key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ) : null
          )}
          {Object.keys(grouped)
            .filter((pos) => !POSITIONS.includes(pos))
            .map((pos) => (
              <PositionGroup key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-base text-app-muted-text italic">Awaiting votes...</p>
        </div>
      )}
    </div>
  );
}

function HistoryResults({ election }) {
  const candidates = election.candidates || [];
  const maxVotes = Math.max(...candidates.map((c) => Number(c.vote_count ?? 0)), 1);
  const totalVotes = candidates.reduce((acc, c) => acc + Number(c.vote_count ?? 0), 0);

  const grouped = useMemo(() => {
    const g = {};
    for (const c of candidates) {
      const pos = c.position || "Unknown";
      if (!g[pos]) g[pos] = [];
      g[pos].push(c);
    }
    return g;
  }, [candidates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-app-muted-text">
          {new Date(election.snapshot_at).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </span>
        <span className="text-sm font-mono text-app-muted-text ml-auto">{totalVotes} votes</span>
      </div>
      {candidates.length > 0 ? (
        <div className="space-y-4">
          {POSITIONS.map((pos) =>
            grouped[pos] ? (
              <PositionGroup key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ) : null
          )}
          {Object.keys(grouped)
            .filter((pos) => !POSITIONS.includes(pos))
            .map((pos) => (
              <PositionGroup key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ))}
        </div>
      ) : (
        <p className="text-xs text-app-muted-text italic">No data</p>
      )}
    </div>
  );
}

export default function Results() {
  const [history, setHistory] = useState([]);
  const [selectedElection, setSelectedElection] = useState("live");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/results/history`);
        const d = await res.json();
        if (Array.isArray(d)) setHistory(d);
      } catch {}
    };
    fetchHistory();
  }, []);

  const tabs = useMemo(() => {
    const t = [{ key: "live", label: "Live" }];
    for (const h of history) {
      t.push({ key: String(h.election_number), label: `Election ${h.election_number}`, data: h });
    }
    return t;
  }, [history]);

  const currentElection = tabs.find((t) => t.key === selectedElection);

  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-app">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
          </span>
          <h2 className="text-base font-semibold text-app-heading">Results</h2>
        </div>

        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedElection(tab.key)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  selectedElection === tab.key
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    : "bg-app-surface text-app-muted-text border-app hover:border-app-accent/30 hover:text-app-heading"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {selectedElection === "live" ? (
          <LiveResults />
        ) : currentElection?.data ? (
          <HistoryResults election={currentElection.data} />
        ) : (
          <div className="py-8 text-center">
            <p className="text-base text-app-muted-text italic">Election data not available</p>
          </div>
        )}
      </div>
    </div>
  );
}
