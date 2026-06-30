import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import CandidateSelfRegister from "./CandidateSelfRegister";
import { API_URL } from "../config";

function formatRemaining(seconds) {
  if (seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const p = (v) => String(v).padStart(2, "0");
  if (h > 0) return `${h}h ${p(m)}m ${p(s)}s`;
  if (m > 0) return `${m}m ${p(s)}s`;
  return `${s}s`;
}

export default function MainRegistrationBanner() {
  const { wallet, student } = useContext(AuthContext);

  const [phase, setPhase] = useState(null);
  const [regEnd, setRegEnd] = useState(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [loadingPhase, setLoadingPhase] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPhase(true);
      try {
        const res = await fetch(`${API_URL}/api/contract/phase`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          setPhase(data.phase);
          setRegEnd(data.registrationEnd);
        }
      } catch (err) {
        console.error("Failed to load phase:", err);
      } finally {
        if (!cancelled) setLoadingPhase(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (loadingPhase) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-5 animate-pulse">
        <div className="h-4 w-36 bg-app-muted rounded" />
      </div>
    );
  }

  const remaining = regEnd ? regEnd - now : 0;
  const isOpen = phase === 1 && remaining > 0;

  if (!isOpen) {
    const expired = phase === 1 && remaining <= 0;
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-amber-400 text-base">⏸</span>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-400">Candidate Registration {expired ? "Ended" : "Closed"}</p>
            <p className="text-sm text-app-muted-text mt-0.5">
              {expired
                ? "The registration window has expired. Contact the admin if you need an extension."
                : "Registration is not open yet. Wait for the admin to open it."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <span className="text-emerald-400 text-lg">📝</span>
          </div>
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-400">Candidate Registration Open</p>
          <p className="text-xs text-app-muted-text mt-0.5">
            {remaining > 0 ? (
              <>Closes in <span className="font-mono font-bold text-emerald-400">{formatRemaining(remaining)}</span></>
            ) : "The registration window is active."}
          </p>
        </div>
      </div>

      {!wallet ? (
        <div className="rounded-lg border border-app bg-app-muted/30 p-4 text-center">
          <p className="text-sm text-app-muted-text">Connect your wallet to register as a candidate.</p>
        </div>
      ) : !student ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400">
            You are not registered as a student. Open the Student Portal to create your account first.
          </p>
        </div>
      ) : !student.verified ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400">
            You must be whitelisted as a voter before registering as a candidate. Contact the admin.
          </p>
        </div>
      ) : (
        <CandidateSelfRegister student={student} regEnd={regEnd} />
      )}
    </div>
  );
}
