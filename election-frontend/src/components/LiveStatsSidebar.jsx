import { useState, useEffect } from "react";
import { API_URL } from "../config";

function formatRemaining(seconds) {
  if (seconds <= 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const p = (v) => String(v).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${p(m)}m`;
  if (h > 0) return `${h}h ${p(m)}m ${p(s)}s`;
  if (m > 0) return `${m}m ${p(s)}s`;
  return `${s}s`;
}

export default function LiveStatsSidebar() {
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/results/stats`);
        const d = await res.json();
        if (d) setStats(d);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = stats?.phase ?? 0;
  const isVoting = phase === 2;

  const votingRemaining = stats?.votingEnd ? stats.votingEnd - now : 0;
  const votingTimeLeft = votingRemaining > 0 ? formatRemaining(votingRemaining) : null;

  const registrationRemaining = stats?.registrationEnd ? stats.registrationEnd - now : 0;
  const registrationTimeLeft = registrationRemaining > 0 ? formatRemaining(registrationRemaining) : null;

  const phaseConfig = {
    0: { label: "CREATED", sub: "Not yet open", color: "text-app-muted-text", border: "border-app/30", bg: "from-app-surface to-app-bg" },
    1: { label: "REGISTRATION OPEN", sub: "Candidates & Voters can register", color: "text-amber-300", border: "border-amber-500/25", bg: "from-amber-500/15 via-amber-500/8 to-amber-500/3" },
    2: { label: "VOTING LIVE", sub: "Election in Progress", color: "text-emerald-300", border: "border-emerald-500/25", bg: "from-emerald-500/15 via-emerald-500/8 to-emerald-500/3" },
    3: { label: "ELECTION ENDED", sub: "Final results available", color: "text-app-muted-text", border: "border-app/30", bg: "from-app-surface to-app-bg" },
  };

  const pc = phaseConfig[phase] || phaseConfig[0];

  const registrationEnded = phase === 1 && stats?.registrationEnd && now >= stats.registrationEnd;
  const noRegEndSet = phase === 1 && (!stats?.registrationEnd || stats.registrationEnd === 0);
  const votingEnded = phase === 2 && stats?.votingEnd && now >= stats.votingEnd;

  const countdownInfo = phase === 1 && !registrationEnded && !noRegEndSet
    ? { remaining: registrationRemaining, timeLeft: registrationTimeLeft, label: "Registration Closes" }
    : phase === 2 && !votingEnded
      ? { remaining: votingRemaining, timeLeft: votingTimeLeft, label: "Time Remaining" }
      : null;

  if (!stats) return null;

  const noVoteInfo = {
    0: { icon: "🗓️", text: "The election has been created. The registration phase will open soon." },
    1: registrationEnded
      ? { icon: "⏰", text: `${stats.candidateCount ?? 0} candidate${stats.candidateCount !== 1 ? "s" : ""} registered. The registration window has closed — waiting for the admin to start voting.` }
      : noRegEndSet
        ? { icon: "📝", text: `${stats.candidateCount ?? 0} candidate${stats.candidateCount !== 1 ? "s" : ""} registered so far.` }
        : { icon: "📝", text: `${stats.candidateCount ?? 0} candidate${stats.candidateCount !== 1 ? "s" : ""} registered — the ballot is taking shape.` },
    2: votingEnded
      ? { icon: "⏰", text: `${stats.votesCast} vote${stats.votesCast !== 1 ? "s" : ""} cast. The voting window has closed — waiting for the admin to finalize results.` }
      : null,
    3: { icon: "🏁", text: "This election has concluded. View the results tab for final outcomes." },
  };

  const isExpired = registrationEnded || votingEnded;
  const phaseLabel = registrationEnded ? "REGISTRATION CLOSED" : votingEnded ? "VOTING ENDED" : pc.label;
  const phaseSub = registrationEnded ? "Awaiting voting phase" : votingEnded ? "Awaiting finalization" : pc.sub;
  const phaseColor = isExpired ? "text-rose-300" : pc.color;
  const phaseBorder = isExpired ? "border-rose-500/25" : pc.border;
  const phaseBg = isExpired ? "from-rose-500/15 via-rose-500/8 to-rose-500/3" : pc.bg;

  return (
    <aside className="space-y-5">
      {/* Phase header */}
      <div className={`relative overflow-hidden rounded-2xl border ${phaseBorder} bg-gradient-to-br ${phaseBg} p-6 text-center shadow-sm`}>
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-1.5">
            {phase === 2 && !votingEnded && (
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              </span>
            )}
            <span className={`text-xl font-black tracking-wide ${phaseColor}`}>
              {phaseLabel}
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-muted-text/50 mt-1">{phaseSub}</p>
        </div>
      </div>

      {/* Countdown */}
      {countdownInfo && countdownInfo.timeLeft && (
        <div className="relative overflow-hidden rounded-2xl border border-app/30 bg-gradient-to-br from-app-surface to-app-bg p-6 text-center shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-b from-app-accent/[0.03] to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="text-2xl">⏱️</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-app-muted-text">{countdownInfo.label}</span>
            </div>
            <p className="text-4xl font-black tabular-nums tracking-tight text-app-heading">{countdownInfo.timeLeft}</p>
            <div className="mt-4 mx-auto w-16 h-1 rounded-full bg-gradient-to-r from-app-accent/40 via-app-accent/60 to-app-accent/40" />
          </div>
        </div>
      )}

      {/* Live stats */}
      {isVoting && !votingEnded && (
        <>
          {/* Three key stats in one compact row */}
          <div className="rounded-2xl border border-app/30 bg-gradient-to-br from-app-surface to-app-bg p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-3xl font-black tabular-nums text-emerald-400 leading-none">{stats.votesCast}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mt-2 leading-tight">Voted</p>
              </div>
              <div className="border-x border-app/20">
                <p className="text-3xl font-black tabular-nums text-amber-400 leading-none">{stats.remaining}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mt-2 leading-tight">Remaining</p>
              </div>
              <div>
                <p className="text-3xl font-black tabular-nums text-app-heading leading-none">{stats.totalVoters}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mt-2 leading-tight">Total</p>
              </div>
            </div>
          </div>

          {/* Turnout section */}
          <div className="relative overflow-hidden rounded-2xl border border-app/30 bg-gradient-to-br from-app-surface to-app-bg p-5 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📊</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-app-muted-text">Turnout</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-app-heading">{stats.turnout}%</span>
              </div>
              <div className="h-3.5 rounded-full bg-app-border/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 via-emerald-400 to-emerald-300 transition-all duration-1000 relative overflow-hidden shadow-inner"
                  style={{ width: `${Math.min(stats.turnout, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full" />
                </div>
              </div>
              <div className="flex justify-between mt-2.5 text-xs font-semibold text-app-muted-text/70">
                <span>{stats.votesCast} voted</span>
                <span>{stats.remaining} remaining</span>
              </div>
            </div>
          </div>

          {/* Position breakdown */}
          {stats.positions?.length > 0 && (
            <div className="rounded-2xl border border-app/30 bg-gradient-to-br from-app-surface to-app-bg p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-xl">📋</span>
                <span className="text-xs font-bold uppercase tracking-widest text-app-muted-text">By Position</span>
              </div>
              <div className="space-y-5">
                {stats.positions.map((pos, i) => {
                  const maxVotes = Math.max(...stats.positions.map(p => p.votes), 1);
                  const barWidth = (pos.votes / maxVotes) * 100;
                  const colors = [
                    "from-sky-500 to-sky-400",
                    "from-violet-500 to-violet-400",
                    "from-rose-500 to-rose-400",
                  ];
                  return (
                    <div key={pos.position}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-bold text-app-heading">{pos.position}</span>
                        <span className="text-2xl font-black tabular-nums text-app-heading leading-none">
                          —
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-app-muted-text/60 mb-2">
                        {pos.candidates} candidate{pos.candidates > 1 ? "s" : ""} running
                      </p>
                      <div className="h-2.5 rounded-full bg-app-border/20 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-700 shadow-sm`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Non-voting context */}
      {phase === 1 && !registrationEnded && !noRegEndSet && (
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-amber-500/3 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📋</span>
            <span className="text-xs font-bold uppercase tracking-widest text-app-muted-text">Candidates by Position</span>
          </div>
          <div className="space-y-3">
            {stats.positions?.map((pos, i) => {
              const colors = ["text-app-accent", "text-app-trust", "text-app-ballot"];
              const dotColors = ["bg-app-accent", "bg-app-trust", "bg-app-ballot"];
              return (
                <div key={pos.position} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full ${dotColors[i % dotColors.length]}`} />
                    <span className="text-base font-bold text-app-heading">{pos.position}</span>
                  </div>
                  <span className={`text-3xl font-black tabular-nums leading-none ${colors[i % colors.length]}`}>
                    {pos.candidates}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(!isVoting || votingEnded) && noVoteInfo[phase] && phase !== 1 && (
        <div className="rounded-2xl border border-app/30 bg-gradient-to-br from-app-surface to-app-bg p-6 text-center">
          <span className="text-3xl mb-3 block">{noVoteInfo[phase].icon}</span>
          <p className="text-sm font-semibold text-app-muted-text">{noVoteInfo[phase].text}</p>
        </div>
      )}
      {(phase === 1 && (registrationEnded || noRegEndSet)) && (
        <div className="rounded-2xl border border-app/30 bg-gradient-to-br from-app-surface to-app-bg p-6 text-center">
          <span className="text-3xl mb-3 block">{noVoteInfo[phase].icon}</span>
          <p className="text-sm font-semibold text-app-muted-text">{noVoteInfo[phase].text}</p>
        </div>
      )}
    </aside>
  );
}
