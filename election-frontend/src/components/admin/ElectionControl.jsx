import { getContractV3 } from "../../contract";
import { useMemo, useState } from "react";
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
    const registrationEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const votingStart = new Date(registrationEnd.getTime() + 5 * 60 * 1000);
    const votingEnd = new Date(votingStart.getTime() + 60 * 60 * 1000);

    return {
      registrationStart: toDateTimeLocal(now),
      registrationEnd: toDateTimeLocal(registrationEnd),
      votingStart: toDateTimeLocal(votingStart),
      votingEnd: toDateTimeLocal(votingEnd),
    };
  }, []);

  const [registrationStart, setRegistrationStart] = useState(defaults.registrationStart);
  const [registrationEnd, setRegistrationEnd] = useState(defaults.registrationEnd);
  const [votingStart, setVotingStart] = useState(defaults.votingStart);
  const [votingEnd, setVotingEnd] = useState(defaults.votingEnd);
  const [loading, setLoading] = useState(false);

  async function startRegistration() {
    setLoading(true);
    try {
      const contract = await getContractV3();
      const tx = await contract.startRegistration(toUnixSeconds(registrationEnd));
      await tx.wait();
      success("Registration window started successfully");
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
      const contract = await getContractV3();
      const tx = await contract.startVoting(toUnixSeconds(votingEnd));
      await tx.wait();
      success("Voting window scheduled successfully");
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
      await tx.wait();
      success("Election finalized successfully");
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || "Error finalizing election");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader icon="⚙️" title="Election Control" subtitle="Lifecycle Management" />

      <div className="space-y-4">
        <DateInput
          label="Registration Start"
          value={registrationStart}
          onChange={setRegistrationStart}
          disabled={loading}
        />
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
          label="Voting Start"
          value={votingStart}
          onChange={setVotingStart}
          disabled={loading}
        />
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

      <div className="border-t border-app/80 pt-5">
        <ActionButton variant="rose" onClick={finalizeElection} disabled={loading} icon="🏁">
          {loading ? "Processing…" : "Finalize Election"}
        </ActionButton>
      </div>
    </div>
  );
}
