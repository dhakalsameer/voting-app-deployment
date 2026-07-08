import { useEffect, useState, useRef, useMemo } from "react";
import { socket } from "../socket";
import { API_URL, CONTRACT_ADDRESS_V3, SEPOLIA_EXPLORER } from "../config";

const PHASE_NAMES = ["Created", "Registration", "Voting", "Ended"];
const POSITION_NAMES = ["President", "Secretary", "General Member"];

const EVENT_META = {
  VoteCast:                { label: "Vote Cast",        color: "emerald", icon: "🗳" },
  CandidateRegistered:     { label: "Candidate Reg",    color: "blue",    icon: "📝" },
  PhaseChanged:            { label: "Phase Changed",    color: "amber",   icon: "🔄" },
  MerkleRootUpdated:       { label: "Merkle Root",      color: "violet",  icon: "🌳" },
  IdentityMerkleRootUpdated: { label: "Identity Root",  color: "cyan",    icon: "🆔" },
  NewElectionStarted:      { label: "New Election",     color: "rose",    icon: "🏁" },
};

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts * 1000) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function truncate(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function Badge({ variant, children }) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue:    "bg-app-accent/10 text-app-accent   border-app-accent/20",
    amber:   "bg-amber-500/10  text-amber-400  border-amber-500/20",
    violet:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cyan:    "bg-cyan-500/10   text-cyan-400   border-cyan-500/20",
    rose:    "bg-rose-500/10   text-rose-400   border-rose-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg border ${colors[variant] || colors.emerald}`}>
      {children}
    </span>
  );
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text);
}

function valueDisplay(key, value) {
  if (key === "voter" || key === "candidate" || key === "account" || key === "candidateAddr")
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  if (key === "newPhase" || key === "phase")
    return `${Number(value)} (${PHASE_NAMES[Number(value)] || "Unknown"})`;
  if (key === "position")
    return `${Number(value)} (${POSITION_NAMES[Number(value)] || "Unknown"})`;
  if (key === "newRoot" || key === "identityRoot")
    return `${value.slice(0, 10)}...${value.slice(-6)}`;
  if (key === "electionId" || key === "id")
    return `#${value.toString()}`;
  if (typeof value === "boolean")
    return value ? "Yes" : "No";
  return String(value);
}

function EventCard({ event }) {
  const [copied, setCopied] = useState(false);
  const [fromCopied, setFromCopied] = useState(false);

  const handleCopy = (text, setter) => {
    copyToClipboard(text);
    setter(true);
    setTimeout(() => setter(false), 1200);
  };

  const meta = EVENT_META[event.eventName] || { label: event.eventName, color: "emerald", icon: "📄" };
  const args = event.args || {};

  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden transition-all hover:border-app-accent/30">
      <div className="flex items-center justify-between px-5 py-3 border-b border-app/50 bg-app-muted/20">
        <div className="flex items-center gap-3">
          <span className="text-base">{meta.icon}</span>
          <Badge variant={meta.color}>{meta.label}</Badge>
          {event.fromAddress && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-app-muted-text uppercase tracking-wider font-bold">From</span>
              <button
                onClick={() => handleCopy(event.fromAddress, setFromCopied)}
                className="text-sm font-mono text-app-muted-text hover:text-app-accent transition-colors cursor-pointer font-medium"
                title="Copy wallet address"
              >
                {truncate(event.fromAddress)}
              </button>
              {fromCopied && <span className="text-xs text-emerald-400 font-semibold">Copied</span>}
            </div>
          )}
          {event.txHash && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-app-muted-text uppercase tracking-wider font-bold">Tx</span>
              <button
                onClick={() => handleCopy(event.txHash, setCopied)}
                className="text-sm font-mono text-app-muted-text hover:text-app-accent transition-colors cursor-pointer font-medium"
                title="Copy tx hash"
              >
                {truncate(event.txHash)}
              </button>
              <a
                href={`${SEPOLIA_EXPLORER}/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-app-heading hover:text-app-accent transition-colors font-bold"
                title="View on Etherscan"
              >
                ↗
              </a>
              {copied && <span className="text-xs text-emerald-400 font-semibold">Copied</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-app-muted-text">
          {event.blockNumber && (
            <a
              href={`${SEPOLIA_EXPLORER}/block/${event.blockNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-app-accent transition-colors"
            >
              #{event.blockNumber}
            </a>
          )}
          {event.timestamp && (
            <span title={new Date(event.timestamp * 1000).toLocaleString()}>
              {timeAgo(event.timestamp)}
            </span>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        {event.eventName === "CandidateRegistered" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-app-muted-text">Candidate ID</span>
            <span className="text-app-heading font-mono font-bold">{args.id?.toString()}</span>
            <span className="text-app-muted-text">Wallet</span>
            <span className="text-app-heading font-mono text-xs">{args.candidate || "Unknown"}</span>
            <span className="text-app-muted-text">Name</span>
            <span className="text-app-heading font-medium">{args.name}</span>
            <span className="text-app-muted-text">Position</span>
            <span className="text-app-heading">{POSITION_NAMES[Number(args.position)] || `Unknown (${args.position})`}</span>
          </div>
        )}
        {event.eventName === "VoteCast" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-app-muted-text">Voter</span>
            <span className="text-app-heading font-mono text-xs">{args.voter || "Unknown"}</span>
            <span className="text-app-muted-text">Candidate ID</span>
            <span className="text-app-heading font-mono font-bold">#{args.candidateId?.toString()}</span>
          </div>
        )}
        {event.eventName === "PhaseChanged" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-app-muted-text">New Phase</span>
            <span className="text-app-heading font-bold">{PHASE_NAMES[Number(args.newPhase)] || `Unknown (${args.newPhase})`}</span>
          </div>
        )}
        {event.eventName === "MerkleRootUpdated" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-app-muted-text">New Root</span>
            <span className="text-app-heading font-mono text-xs break-all">{args.newRoot}</span>
          </div>
        )}
        {event.eventName === "IdentityMerkleRootUpdated" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-app-muted-text">New Identity Root</span>
            <span className="text-app-heading font-mono text-xs break-all">{args.newRoot}</span>
          </div>
        )}
        {event.eventName === "NewElectionStarted" && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-app-muted-text">Election ID</span>
            <span className="text-app-heading font-mono font-bold">#{args.electionId?.toString()}</span>
          </div>
        )}
        {!["CandidateRegistered", "VoteCast", "PhaseChanged", "MerkleRootUpdated", "IdentityMerkleRootUpdated", "NewElectionStarted"].includes(event.eventName) && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {Object.entries(args).filter(([k]) => isNaN(Number(k))).map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-app-muted-text capitalize">{k}</span>
                <span className="text-app-heading font-mono">{valueDisplay(k, v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function updateStatsFromAll(events) {
  const s = { total: 0, votes: 0, candidates: 0, phaseChanges: 0, merkleUpdates: 0, identityUpdates: 0, elections: 0 };
  for (const e of events) {
    s.total++;
    s.votes      += e.eventName === "VoteCast" ? 1 : 0;
    s.candidates += e.eventName === "CandidateRegistered" ? 1 : 0;
    s.phaseChanges      += e.eventName === "PhaseChanged" ? 1 : 0;
    s.merkleUpdates      += e.eventName === "MerkleRootUpdated" ? 1 : 0;
    s.identityUpdates    += e.eventName === "IdentityMerkleRootUpdated" ? 1 : 0;
    s.elections          += e.eventName === "NewElectionStarted" ? 1 : 0;
  }
  return s;
}

export default function LiveBlockchainDashboard() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [stats, setStats] = useState({
    total: 0, votes: 0, candidates: 0, phaseChanges: 0, merkleUpdates: 0, identityUpdates: 0, elections: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const feedRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/events`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setEvents(data);
        setStats(updateStatsFromAll(data));
        setLoading(false);
      } catch (err) {
        console.error("Failed to load blockchain events:", err);
        if (mounted) {
          setError(err.message || "Failed to load events from server");
          setLoading(false);
        }
      }
    };

    load();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      setEvents(prev => [event, ...prev]);
      setStats(prev => {
        const updated = { ...prev, total: prev.total + 1 };
        updated.votes      += event.eventName === "VoteCast" ? 1 : 0;
        updated.candidates += event.eventName === "CandidateRegistered" ? 1 : 0;
        updated.phaseChanges      += event.eventName === "PhaseChanged" ? 1 : 0;
        updated.merkleUpdates      += event.eventName === "MerkleRootUpdated" ? 1 : 0;
        updated.identityUpdates    += event.eventName === "IdentityMerkleRootUpdated" ? 1 : 0;
        updated.elections          += event.eventName === "NewElectionStarted" ? 1 : 0;
        return updated;
      });
    };

    socket.on("blockchainEvent", handler);
    return () => socket.off("blockchainEvent", handler);
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [events.length]);

  const filtered = useMemo(() => {
    if (filter === "All") return events;
    return events.filter(e => e.eventName === filter);
  }, [events, filter]);

  const tabCounts = useMemo(() => {
    const counts = { All: events.length };
    const EVENT_NAMES = Object.keys(EVENT_META);
    for (const name of EVENT_NAMES) {
      counts[name] = events.filter(e => e.eventName === name).length;
    }
    return counts;
  }, [events]);

  const EVENT_NAMES = useMemo(() => Object.keys(EVENT_META), []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest">Blockchain Activity Feed</h3>
          <span className="text-xs font-mono text-emerald-500/80 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase">Sepolia</span>
        </div>
        <div className="rounded-xl border border-app bg-app-surface p-10 text-center space-y-3">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full" />
          <p className="text-sm text-app-muted-text">Loading blockchain events from server…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <h3 className="text-xl font-black text-rose-400 uppercase tracking-widest">Blockchain Activity Feed</h3>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
          <p className="text-base text-rose-400 font-semibold">{error}</p>
          <p className="text-sm text-app-muted-text mt-2">Make sure the backend server is running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest">Blockchain Activity Feed</h3>
          <span className="text-xs font-mono text-emerald-500/80 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase">Sepolia</span>
        </div>
        <a
          href={`${SEPOLIA_EXPLORER}/address/${CONTRACT_ADDRESS_V3}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-app-muted-text hover:text-app-accent transition-colors underline underline-offset-2"
        >
          View Contract ↗
        </a>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        <StatCard label="Total" value={stats.total} color="emerald" />
        <StatCard label="Votes" value={stats.votes} color="emerald" />
        <StatCard label="Candidates" value={stats.candidates} color="blue" />
        <StatCard label="Phases" value={stats.phaseChanges} color="amber" />
        <StatCard label="Merkle" value={stats.merkleUpdates} color="violet" />
        <StatCard label="Identity" value={stats.identityUpdates} color="cyan" />
        <StatCard label="Elections" value={stats.elections} color="rose" />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterTab active={filter === "All"} onClick={() => setFilter("All")}>
          All <span className="text-xs opacity-60">({tabCounts.All})</span>
        </FilterTab>
        {EVENT_NAMES.map(name => (
          <FilterTab key={name} active={filter === name} onClick={() => setFilter(name)}>
            {EVENT_META[name].icon} {EVENT_META[name].label} <span className="text-xs opacity-60">({tabCounts[name] || 0})</span>
          </FilterTab>
        ))}
      </div>

      {/* Events Feed */}
      <div
        ref={feedRef}
        className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin"
      >
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-app bg-app-muted/20 p-10 text-center">
            <p className="text-base text-app-muted-text">
              {filter === "All" ? "No on-chain events detected yet." : `No ${EVENT_META[filter]?.label || filter} events yet.`}
            </p>
            <p className="text-sm text-app-muted-text mt-1">
              Events will appear here in real-time as the sync engine detects them.
            </p>
          </div>
        ) : (
          filtered.map((ev, i) => <EventCard key={`${ev.txHash}-${ev.logIndex}-${i}`} event={ev} />)
        )}
      </div>

      <p className="text-sm text-app-muted-text leading-relaxed italic">
        Powered by the backend sync engine + Socket.IO — blockchain events are indexed server-side.
      </p>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const dotColors = {
    emerald: "bg-emerald-400",
    blue:    "bg-sky-400",
    amber:   "bg-amber-400",
    violet:  "bg-violet-400",
    cyan:    "bg-cyan-400",
    rose:    "bg-rose-400",
  };
  return (
    <div className="rounded-xl border border-app bg-app-surface px-4 py-3.5 text-center">
      <p className="text-2xl font-black text-app-heading">{value}</p>
      <div className="flex items-center justify-center gap-1.5 mt-1">
        <span className={`h-2 w-2 rounded-full ${dotColors[color] || "bg-emerald-400"}`} />
        <p className="text-xs font-bold uppercase tracking-wider text-app-muted-text">{label}</p>
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-bold px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-app-surface text-app-muted-text border-app hover:border-app-accent/30 hover:text-app-heading"
      }`}
    >
      {children}
    </button>
  );
}
