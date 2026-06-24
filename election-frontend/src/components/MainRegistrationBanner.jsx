import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL } from "../config";
import CandidateSelfRegister from "./CandidateSelfRegister";

export default function MainRegistrationBanner() {
  const { wallet, student } = useContext(AuthContext);

  const [phase, setPhase] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState(true);
  const [application, setApplication] = useState(null);
  const [appLoading, setAppLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPhase(true);
      try {
        const contract = await getContractV3();
        const p = await contract.getPhase();
        if (!cancelled) setPhase(Number(p));
      } catch (err) {
        console.error("Failed to load phase:", err);
      } finally {
        if (!cancelled) setLoadingPhase(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!student?.student_id) return;
    setAppLoading(true);
    fetch(`${API_URL}/api/candidates?applied_by=${student.student_id}`)
      .then((r) => r.json())
      .then((data) => setApplication(Array.isArray(data) ? data[0] : null))
      .catch(() => {})
      .finally(() => setAppLoading(false));
  }, [student?.student_id]);

  if (loadingPhase) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-5 animate-pulse">
        <div className="h-4 w-36 bg-app-muted rounded" />
      </div>
    );
  }

  const isOpen = phase === 1;

  if (!isOpen) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-amber-400 text-base">⏸</span>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-400">Candidate Registration Closed</p>
            <p className="text-xs text-app-muted-text mt-0.5">
              Registration is not open yet. Wait for the admin to open it.
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
            The registration window is active. Eligible candidates can register on-chain.
          </p>
        </div>
      </div>

      {!wallet ? (
        <div className="rounded-lg border border-app bg-app-muted/30 p-4 text-center">
          <p className="text-sm text-app-muted-text">Connect your wallet to check eligibility.</p>
        </div>
      ) : appLoading ? (
        <div className="rounded-lg border border-app bg-app-muted/30 p-4 animate-pulse">
          <p className="text-xs text-app-muted-text">Checking your application status…</p>
        </div>
      ) : !student ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-400">
            You are not registered as a student. Open the Student Portal to create your account first.
          </p>
        </div>
      ) : application?.status === "approved" && (student.verified || student.eligible_to_vote) ? (
        <CandidateSelfRegister student={student} />
      ) : application?.status === "approved" && !student.verified ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-400">
            Your candidate application is approved, but you need to be whitelisted as a voter before registering on-chain.
          </p>
        </div>
      ) : !student.verified ? (
        <div className="rounded-lg border border-app bg-app-muted/30 p-4">
          <p className="text-xs text-app-muted-text">
            You must be whitelisted as a voter to apply as a candidate. Open the Student Portal to check your status.
          </p>
        </div>
      ) : !application ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-400">
            Registration is open. Open the Student Portal to apply as a candidate.
          </p>
        </div>
      ) : application?.status === "pending" ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-400">
            Your application is under review. Wait for admin approval.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-xs text-rose-400">
            Your application was rejected. Contact the election committee.
          </p>
        </div>
      )}
    </div>
  );
}
