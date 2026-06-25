import { getContractV3 } from "../../contract";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";

const PHASE_NAMES = ["Created", "Registration", "Voting", "Ended"];

const PHASE_DESCRIPTIONS = {
  0: "The election contract is deployed and ready. Start registration to begin accepting candidate applications.",
  1: "Candidates can register on-chain. Move to voting when registration closes.",
  2: "Verified voters can cast their vote. End the election when voting is complete.",
  3: "All voting is complete. Winners can be recorded by starting a new election cycle.",
};

function formatRemaining(seconds) {
  if (seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function toDateTimeLocal(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toUnixSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function PhaseTag({ phase, remaining }) {
  const colors = [
    "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ];
  const pulse = phase === 1 || phase === 2;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-app bg-app-surface px-4 py-3">
      <div className="relative">
        <span className={`h-2.5 w-2.5 rounded-full block ${colors[phase]?.split(" ")[0] || "bg-app-muted"}`} />
        {pulse && <span className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-inherit animate-ping opacity-50" />}
      </div>
      <span className="text-sm font-bold text-app-heading">{PHASE_NAMES[phase]}</span>
      {remaining != null && remaining > 0 && (
        <span className="text-xs font-mono text-emerald-400">{formatRemaining(remaining)} remaining</span>
      )}
      {remaining != null && remaining <= 0 && phase > 0 && phase < 3 && (
        <span className="text-xs font-mono text-rose-400">Deadline passed</span>
      )}
    </div>
  );
}

function ActionCard({ title, description, icon, children }) {
  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-app/50 bg-app-muted/20">
        <span className="text-lg">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-app-heading">{title}</h3>
          <p className="text-xs text-app-muted-text mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DateInput({ label, value, onChange, disabled }) {
  return (
    <label className="grid gap-1.5 text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">
      {label}
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1.5 w-full rounded-xl border border-app bg-app-input text-app-heading px-3.5 py-2.5 text-sm transition-all focus:border-emerald-500 focus:outline-none placeholder:text-app-muted font-mono"
      />
    </label>
  );
}

function ActionButton({ children, variant = "green", onClick, disabled, icon, processing }) {
  const variants = {
    green: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    sky: "bg-sky-500 text-slate-950 hover:bg-sky-400",
    rose: "bg-rose-500 text-slate-950 hover:bg-rose-400",
    amber: "bg-amber-500 text-slate-950 hover:bg-amber-400",
    slate: "bg-app-muted text-app-muted-text",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl ${variants[variant]} px-4 py-3 text-xs font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98`}
    >
      <span className="flex items-center justify-center gap-2">
        {processing ? (
          <span className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
        ) : (
          icon && <span className="text-sm">{icon}</span>
        )}
        {processing ? "Processing on-chain…" : children}
      </span>
    </button>
  );
}

export default function ElectionControl() {
  const { success, error: showError } = useToast();
  const defaults = useMemo(() => {
    const now = new Date();
    const regEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const votEnd = new Date(regEnd.getTime() + 1 * 60 * 60 * 1000);
    return {
      registrationEnd: toDateTimeLocal(regEnd),
      votingEnd: toDateTimeLocal(votEnd),
    };
  }, []);

  const [registrationEnd, setRegistrationEnd] = useState(defaults.registrationEnd);
  const [votingEnd, setVotingEnd] = useState(defaults.votingEnd);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [phase, setPhase] = useState(null);
  const [phaseEnd, setPhaseEnd] = useState(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const loadChainState = async () => {
    try {
      const contract = await getContractV3();
      const p = Number(await contract.getPhase());
      const cc = Number(await contract.candidateCount());
      setPhase(p);
      setCandidateCount(cc);
      if (p === 1) setPhaseEnd(Number(await contract.registrationEnd()));
      else if (p === 2) setPhaseEnd(Number(await contract.votingEnd()));
      else setPhaseEnd(null);
    } catch (err) {
      console.error("loadChainState error:", err);
    }
  };

  useEffect(() => { loadChainState(); }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const contract = await getContractV3();
      const hc = Number(await contract.historyCount());
      if (hc === 0) { setHistory([]); return; }
      const items = [];
      for (let i = 0; i < hc; i++) {
        const r = await contract.electionHistory(i);
        const pres = r.presidentWinnerId > 0 ? await contract.getCandidate(r.presidentWinnerId) : null;
        const sec = r.secretaryWinnerId > 0 ? await contract.getCandidate(r.secretaryWinnerId) : null;
        const gmIds = r.generalMemberWinnerIds || [];
        const gmNames = (await Promise.all(
          gmIds.map(id => id > 0 ? contract.getCandidate(id) : null)
        )).filter(c => c !== null).map(c => c.name);
        items.push({
          id: i,
          timestamp: new Date(Number(r.timestamp) * 1000).toLocaleString(),
          totalCandidates: Number(r.totalCandidates),
          pres: pres?.name || "—",
          sec: sec?.name || "—",
          mem: gmNames.join(", ") || "—",
        });
      }
      setHistory(items);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const execute = async (actionName, fn) => {
    setAction(actionName);
    setLoading(true);
    try {
      const tx = await fn();
      const txHash = tx.hash;
      await tx.wait();
      success(`${actionName} successful`, { txHash });
      await loadChainState();
      if (actionName === "Start New Election") {
        setVotingEnd(defaults.votingEnd);
        setRegistrationEnd(defaults.registrationEnd);
        await loadHistory();
      }
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || err.message || `${actionName} failed`);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const canStartRegistration = phase === 0 || phase === 3;
  const canStartVoting = phase === 1;
  const canEndElection = phase === 2;
  const canStartNewElection = phase === 3 && candidateCount > 0;

  const remaining = phaseEnd != null ? phaseEnd - now : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader icon="⚙️" title="Election Control" />

      {phase !== null && (
        <PhaseTag phase={phase} remaining={remaining} />
      )}

      {phase !== null && (
        <p className="text-xs text-app-muted-text leading-relaxed -mt-2">
          {PHASE_DESCRIPTIONS[phase]}
        </p>
      )}

      {/* Created or Ended: Start Registration */}
      {canStartRegistration && (
        <ActionCard title="Open Registration" description="Allow candidates to register on-chain using their identity Merkle proof." icon="🔓">
          <div className="space-y-3">
            <DateInput
              label="Registration Deadline"
              value={registrationEnd}
              onChange={setRegistrationEnd}
              disabled={loading}
            />
            <ActionButton
              variant="green" icon="📝"
              onClick={() => execute("Start Registration", async () => {
                const endTime = toUnixSeconds(registrationEnd);
                if (!Number.isFinite(endTime)) throw new Error("Invalid registration end time");
                const contract = await getContractV3();
                return contract.startRegistration(endTime);
              })}
              disabled={loading}
              processing={loading && action === "Start Registration"}
            >
              Start Registration Phase
            </ActionButton>
          </div>
        </ActionCard>
      )}

      {/* Registration: Start Voting */}
      {canStartVoting && (
        <ActionCard title="Open Voting" description="Allow verified voters to cast their vote on-chain. Candidates will be locked." icon="🗳️">
          <div className="space-y-3">
            <DateInput
              label="Voting Deadline"
              value={votingEnd}
              onChange={setVotingEnd}
              disabled={loading}
            />
            <ActionButton
              variant="sky" icon="🗳️"
              onClick={() => execute("Start Voting", async () => {
                const endTime = toUnixSeconds(votingEnd);
                if (!Number.isFinite(endTime)) throw new Error("Invalid voting end time");
                const contract = await getContractV3();
                return contract.startVoting(endTime);
              })}
              disabled={loading}
              processing={loading && action === "Start Voting"}
            >
              Start Voting Phase
            </ActionButton>
          </div>
        </ActionCard>
      )}

      {/* Voting: End Election */}
      {canEndElection && (
        <ActionCard title="End Election" description="Close voting and transition to the Ended phase. Votes can no longer be cast." icon="🏁">
          <ActionButton
            variant="rose" icon="🏁"
            onClick={() => execute("End Election", async () => {
              const contract = await getContractV3();
              return contract.endElection();
            })}
            disabled={loading}
            processing={loading && action === "End Election"}
          >
            Finalize Election
          </ActionButton>
        </ActionCard>
      )}

      {/* Ended: Start New Election */}
      {canStartNewElection && (
        <ActionCard
          title="Start New Election"
          description="Record position winners and begin a fresh election cycle. Candidates are reset."
          icon="🔄"
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
              <p className="font-bold">This will:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-app-muted-text">
                <li>Record winners for President, Secretary, and General Member</li>
                <li>Reset candidate count for the next election</li>
                <li>Return the contract to <strong>Created</strong> phase</li>
              </ul>
            </div>
            <ActionButton
              variant="amber" icon="🔄"
              onClick={() => execute("Start New Election", async () => {
                const contract = await getContractV3();
                return contract.startNewElection();
              })}
              disabled={loading}
              processing={loading && action === "Start New Election"}
            >
              Start New Election Cycle
            </ActionButton>
          </div>
        </ActionCard>
      )}

      {/* Ended but no candidates: info state */}
      {phase === 3 && candidateCount === 0 && (
        <ActionCard title="No Candidates" description="Cannot start a new election without registered candidates." icon="⚠️">
          <div className="rounded-lg border border-app bg-app-muted/30 p-4 text-center">
            <p className="text-xs text-app-muted-text">
              The previous election had no candidates. Use the voter management panel to add students and whitelist them,
              then candidates can register when you open registration.
            </p>
          </div>
        </ActionCard>
      )}

      {/* Election History */}
      <div className="border-t border-app/80 pt-5">
        <SectionHeader icon="📜" title="Election History" />
        {historyLoading ? (
          <p className="text-sm text-app-muted-text animate-pulse mt-2">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-app-muted-text mt-2">No past election results yet.</p>
        ) : (
          <div className="space-y-3 mt-3">
            {history.map((r) => (
              <div key={r.id} className="rounded-lg border border-app bg-app-surface p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-app-heading">Election #{r.id + 1}</span>
                  <span className="text-app-muted-text">{r.timestamp}</span>
                </div>
                <p className="text-app-muted-text">{r.totalCandidates} candidates</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded bg-emerald-500/10 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase text-emerald-400 font-bold">President</p>
                    <p className="font-semibold text-app-heading truncate">{r.pres}</p>
                  </div>
                  <div className="rounded bg-sky-500/10 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase text-sky-400 font-bold">Secretary</p>
                    <p className="font-semibold text-app-heading truncate">{r.sec}</p>
                  </div>
                  <div className="rounded bg-amber-500/10 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase text-amber-400 font-bold">General Member</p>
                    <p className="font-semibold text-app-heading truncate">{r.mem}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
