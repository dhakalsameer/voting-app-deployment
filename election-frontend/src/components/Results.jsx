import { useState, useEffect, useMemo } from "react";
import { API_URL } from "../config";
import { getContractV3 } from "../contract";
import { socket } from "../socket";

const POSITIONS = ["President", "Secretary", "General Member"];

function getImageUrl(cid) {
  if (!cid) return null;
  if (cid.startsWith("local:")) return `${API_URL}/uploads/${cid.slice(6)}`;
  if (cid.startsWith("http")) return cid;
  return `https://ipfs.io/ipfs/${cid}`;
}

function fmtYear(y) {
  if (!y) return "";
  const n = parseInt(y, 10);
  if (Number.isFinite(n)) return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"} Year`;
  return y;
}

function Avatar({ src, name, size }) {
  const s = size === "sm" ? "h-14 w-14" : "h-16 w-16";
  const fs = size === "sm" ? "text-xs" : "text-sm";
  const initials = (name || "?").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${s} rounded-full overflow-hidden border-2 border-app/30 shrink-0 bg-gradient-to-br from-[var(--app-trust-soft)] to-[var(--app-accent-soft)]`}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover"
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div className={`${src ? "hidden" : "flex"} h-full w-full items-center justify-center ${fs} font-bold text-app-muted-text`}>
        {initials}
      </div>
    </div>
  );
}

function getWinners(candidates) {
  const pres = candidates.filter(c => c.position === "President").sort((a, b) => Number(b.vote_count) - Number(a.vote_count));
  const sec = candidates.filter(c => c.position === "Secretary").sort((a, b) => Number(b.vote_count) - Number(a.vote_count));
  const gms = candidates.filter(c => c.position === "General Member").sort((a, b) => Number(b.vote_count) - Number(a.vote_count)).slice(0, 5);
  return {
    president: pres.length > 0 ? pres[0] : null,
    secretary: sec.length > 0 ? sec[0] : null,
    gmWinners: gms,
  };
}

function WinnersDeclaration({ candidates, isLive, electionNumber }) {
  const winners = useMemo(() => getWinners(candidates), [candidates]);
  const hasAny = winners.president || winners.secretary || winners.gmWinners.length > 0;
  if (!hasAny) return null;

  const title = isLive ? "Current Leaders" : `Election ${electionNumber} Winners`;

  return (
    <div className="rounded-xl border border-[var(--app-trust-border)] bg-gradient-to-br from-[var(--app-trust-soft)] via-[var(--app-accent-soft)] to-[var(--app-ballot-soft)] p-6 mb-6">
      <h3 className="text-base font-bold uppercase tracking-wider text-app-heading mb-5 flex items-center gap-2">
        <span className="text-lg">🏆</span> {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {winners.president && (
          <div className="flex items-center gap-4 rounded-xl border border-[var(--app-trust-border)] bg-[var(--app-trust-soft)] px-5 py-4">
            <Avatar src={getImageUrl(winners.president.image_cid || winners.president.photo)} name={winners.president.name} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-trust)] mb-1">President</p>
              <p className="text-lg font-bold text-app-heading break-words">{winners.president.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {winners.president.year && <span className="text-xs text-app-muted-text whitespace-nowrap">{fmtYear(winners.president.year)}</span>}
                {winners.president.gender && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                    winners.president.gender === "female" ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
                  }`}>{winners.president.gender}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-[var(--app-trust)]">{Number(winners.president.vote_count)}</p>
              <p className="text-[10px] text-app-muted-text">votes</p>
            </div>
          </div>
        )}
        {winners.secretary && (
          <div className="flex items-center gap-4 rounded-xl border border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] px-5 py-4">
            <Avatar src={getImageUrl(winners.secretary.image_cid || winners.secretary.photo)} name={winners.secretary.name} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)] mb-1">Secretary</p>
              <p className="text-lg font-bold text-app-heading break-words">{winners.secretary.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {winners.secretary.year && <span className="text-xs text-app-muted-text whitespace-nowrap">{fmtYear(winners.secretary.year)}</span>}
                {winners.secretary.gender && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                    winners.secretary.gender === "female" ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
                  }`}>{winners.secretary.gender}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-[var(--app-accent)]">{Number(winners.secretary.vote_count)}</p>
              <p className="text-[10px] text-app-muted-text">votes</p>
            </div>
          </div>
        )}
      </div>
      {winners.gmWinners.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-ballot)] mb-3">General Members</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {winners.gmWinners.map((gm, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--app-ballot-border)] bg-[var(--app-ballot-soft)] px-4 py-4 text-center">
                <Avatar src={getImageUrl(gm.image_cid || gm.photo)} name={gm.name} size="sm" />
                <p className="text-sm font-bold text-app-heading leading-snug break-words w-full">{gm.name}</p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {gm.year && <span className="text-[10px] text-app-muted-text">{fmtYear(gm.year)}</span>}
                  {gm.gender && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      gm.gender === "female" ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
                    }`}>{gm.gender}</span>
                  )}
                </div>
                <span className="text-sm font-mono font-bold text-[var(--app-ballot)]">{Number(gm.vote_count)} vote{Number(gm.vote_count) !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ candidate, maxVotes }) {
  const pct = maxVotes > 0 ? ((candidate.vote_count ?? 0) / maxVotes) * 100 : 0;
  const imgSrc = candidate.image_cid || candidate.photo;
  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden transition-all hover:border-app-accent/30">
      <div className="aspect-square bg-app-muted/20 flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={candidate.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div className={`${imgSrc ? "hidden" : "flex"} w-full h-full items-center justify-center text-3xl text-app-muted-text`}>
          {candidate.gender === "female" ? "👩" : "🧑"}
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-bold text-app-heading leading-tight truncate">{candidate.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-app-muted-text">
          {candidate.year && <span>{candidate.year}</span>}
          {candidate.gender && (
            <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
              candidate.gender === "female" ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
            }`}>
              {candidate.gender}
            </span>
          )}
        </div>
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-app-heading font-bold">{candidate.vote_count ?? 0}</span>
            <span className="text-app-muted-text">votes</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-app-border/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--app-trust)] to-[var(--app-accent)] transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PositionSection({ title, candidates, maxVotes }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted-text">{title}</h4>
      {candidates.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {candidates.map((c) => (
            <CandidateCard key={c.name + c.position} candidate={c} maxVotes={maxVotes} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-app-muted-text italic py-4 text-center">No candidates</p>
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
      <WinnersDeclaration candidates={data} isLive={true} electionNumber={null} />
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-app-muted-text ml-auto">{totalVotes} votes</span>
      </div>
      {data.length > 0 ? (
        <div className="space-y-6">
          {POSITIONS.map((pos) =>
            grouped[pos] ? (
              <PositionSection key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ) : null
          )}
          {Object.keys(grouped)
            .filter((pos) => !POSITIONS.includes(pos))
            .map((pos) => (
              <PositionSection key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
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
      <WinnersDeclaration candidates={candidates} isLive={false} electionNumber={election.election_number} />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-app-body">
          {new Date(election.snapshot_at).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </span>
        <span className="text-sm font-mono text-app-muted-text ml-auto">{totalVotes} votes</span>
      </div>
      {candidates.length > 0 ? (
        <div className="space-y-6">
          {POSITIONS.map((pos) =>
            grouped[pos] ? (
              <PositionSection key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ) : null
          )}
          {Object.keys(grouped)
            .filter((pos) => !POSITIONS.includes(pos))
            .map((pos) => (
              <PositionSection key={pos} title={pos} candidates={grouped[pos]} maxVotes={maxVotes} />
            ))}
        </div>
      ) : (
        <p className="text-xs text-app-muted-text italic py-4 text-center">No data</p>
      )}
    </div>
  );
}

export default function Results() {
  const [history, setHistory] = useState([]);
  const [selectedElection, setSelectedElection] = useState("live");

  useEffect(() => {
    const loadHistoryFromContract = async () => {
      try {
        const contract = await getContractV3();
        const hc = Number(await contract.historyCount());
        if (hc === 0) return;
        const items = [];
        for (let i = 0; i < hc; i++) {
          const r = await contract.getElectionResult(i);
          const candidates = [];
          const presId = Number(r.presidentWinnerId);
          if (presId > 0) {
            const c = await contract.getCandidate(presId);
            if (c.exists) {
              candidates.push({
                name: c.name, position: "President",
                vote_count: Number(c.voteCount), year: String(c.year),
                gender: c.isFemale ? "female" : "male",
                photo: getImageUrl(c.imageCID),
              });
            }
          }
          const secId = Number(r.secretaryWinnerId);
          if (secId > 0) {
            const c = await contract.getCandidate(secId);
            if (c.exists) {
              candidates.push({
                name: c.name, position: "Secretary",
                vote_count: Number(c.voteCount), year: String(c.year),
                gender: c.isFemale ? "female" : "male",
                photo: getImageUrl(c.imageCID),
              });
            }
          }
          const gmIds = r.generalMemberWinnerIds.map(Number);
          for (const gid of gmIds) {
            if (gid === 0) continue;
            const c = await contract.getCandidate(gid);
            if (c.exists) {
              candidates.push({
                name: c.name, position: "General Member",
                vote_count: Number(c.voteCount), year: String(c.year),
                gender: c.isFemale ? "female" : "male",
                photo: getImageUrl(c.imageCID),
              });
            }
          }
          items.push({
            election_number: i + 1,
            snapshot_at: new Date(Number(r.timestamp) * 1000).toISOString(),
            candidates,
          });
        }
        if (items.length > 0) setHistory(prev => prev.length === 0 ? items : prev);
      } catch (err) {
        console.error("Contract fallback failed:", err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/results/history`);
        const d = await res.json();
        if (Array.isArray(d) && d.length > 0) { setHistory(d); return; }
      } catch {}
      await loadHistoryFromContract();
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
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--app-accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--app-accent)]" />
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
                    ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-accent-border)]"
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
