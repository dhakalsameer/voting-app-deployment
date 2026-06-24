import { getContractV3 } from "../../contract";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";

function toDateTimeLocal(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toUnixSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
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

function ActionButton({ children, variant = "green", onClick, disabled, icon }) {
  const variants = {
    green: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow",
    emerald: "bg-teal-500 text-slate-950 hover:bg-teal-400 hover:shadow-neon-glow",
    rose: "bg-rose-500 text-slate-950 hover:bg-rose-400 hover:shadow-neon-glow",
    sky: "bg-sky-500 text-slate-950 hover:bg-sky-400 hover:shadow-neon-glow",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl ${variants[variant]} px-4 py-3 text-xs font-black uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98`}
    >
      <span className="flex items-center justify-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        {children}
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
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const contract = await getContractV3();
      const hc = Number(await contract.historyCount());
      if (hc === 0) { setHistory([]); return; }
      const items = [];
      for (let i = 0; i < hc; i++) {
        const r = await contract.electionHistory(i);
        const pres = await contract.getCandidate(r.presidentWinnerId);
        const sec = await contract.getCandidate(r.secretaryWinnerId);
        const mem = await contract.getCandidate(r.generalMemberWinnerId);
        items.push({
          id: i,
          timestamp: new Date(Number(r.timestamp) * 1000).toLocaleString(),
          totalCandidates: Number(r.totalCandidates),
          pres: pres.name,
          sec: sec.name,
          mem: mem.name,
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

  async function startRegistration() {
    setLoading(true);
    try {
      const endTime = toUnixSeconds(registrationEnd);
      if (!Number.isFinite(endTime)) throw new Error("Invalid registration end time");
      const contract = await getContractV3();
      const tx = await contract.startRegistration(endTime);
      const txHash = tx.hash;
      await tx.wait();
      success("Registration window started", { txHash });
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || "Error starting registration");
    } finally {
      setLoading(false);
    }
  }

  async function startElection() {
    setLoading(true);
    try {
      const endTime = toUnixSeconds(votingEnd);
      if (!Number.isFinite(endTime)) throw new Error("Invalid voting end time");
      const contract = await getContractV3();
      const tx = await contract.startVoting(endTime);
      const txHash = tx.hash;
      await tx.wait();
      success("Voting window started", { txHash });
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || "Error starting election");
    } finally {
      setLoading(false);
    }
  }

  async function finalizeElection() {
    setLoading(true);
    try {
      const contract = await getContractV3();
      const tx = await contract.endElection();
      const txHash = tx.hash;
      await tx.wait();
      success("Election finalized", { txHash });
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || "Error finalizing election");
    } finally {
      setLoading(false);
    }
  }

  async function startNewElection() {
    setLoading(true);
    try {
      const contract = await getContractV3();
      const tx = await contract.startNewElection();
      const txHash = tx.hash;
      await tx.wait();
      success("New election cycle started — winners recorded", { txHash });
      setVotingEnd(defaults.votingEnd);
      setRegistrationEnd(defaults.registrationEnd);
      loadHistory();
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || "Error starting new election");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader icon="⚙️" title="Election Control" />

      <div className="space-y-4">
        <DateInput
          label="Registration End"
          value={registrationEnd}
          onChange={setRegistrationEnd}
          disabled={loading}
        />
        <ActionButton variant="green" onClick={startRegistration} disabled={loading} icon="🔓">
          {loading ? "Processing…" : "Start Registration Phase"}
        </ActionButton>
      </div>

      <div className="space-y-4 border-t border-app/80 pt-6">
        <DateInput
          label="Voting End"
          value={votingEnd}
          onChange={setVotingEnd}
          disabled={loading}
        />
        <ActionButton variant="emerald" onClick={startElection} disabled={loading} icon="🗳️">
          {loading ? "Processing…" : "Start Voting Phase"}
        </ActionButton>
      </div>

      <div className="space-y-3 border-t border-app/80 pt-5">
        <ActionButton variant="rose" onClick={finalizeElection} disabled={loading} icon="🏁">
          {loading ? "Processing…" : "Finalize Election"}
        </ActionButton>
        <ActionButton variant="sky" onClick={startNewElection} disabled={loading} icon="🔄">
          {loading ? "Processing…" : "Start New Election Cycle"}
        </ActionButton>
      </div>

      <div className="border-t border-app/80 pt-5">
        <SectionHeader icon="📜" title="Election History" />
        {historyLoading ? (
          <p className="text-sm text-app-muted-text animate-pulse mt-2">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-app-muted-text mt-2">No past election results yet.</p>
        ) : (
          <div className="space-y-3 mt-3">
            {history.map((r) => (
              <div key={r.id} className="rounded-lg border border-app bg-app-muted/30 p-3 space-y-1.5 text-xs">
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
                  <div className="rounded bg-teal-500/10 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase text-teal-400 font-bold">Secretary</p>
                    <p className="font-semibold text-app-heading truncate">{r.sec}</p>
                  </div>
                  <div className="rounded bg-sky-500/10 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase text-sky-400 font-bold">General Member</p>
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
