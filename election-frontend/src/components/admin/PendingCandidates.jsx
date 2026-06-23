import { useEffect, useState, useContext } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";
import { useToast } from "../ui/Toast";

const POSITION_LABELS = [
  { value: "President", label: "President", icon: "👤" },
  { value: "Secretary", label: "Secretary", icon: "📝" },
  { value: "General Member", label: "General Member", icon: "🤝" },
];

export default function PendingCandidates() {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState({});

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/candidates/pending?adminWallet=${wallet}`
      );
      if (!res.ok) throw new Error("Failed to load pending candidates");
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      showError(err.message || "Could not load pending applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet) loadPending();
  }, [wallet]);

  const handleAction = async (id, action) => {
    setProcessing((prev) => ({ ...prev, [id]: action }));
    try {
      const res = await fetch(
        `${API_URL}/api/candidates/${id}/${action}?adminWallet=${wallet}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${action} failed`);

      success(data.message);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showError(err.message || `${action} failed`);
    } finally {
      setProcessing((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-app-muted text-sm animate-pulse">
        Loading pending applications…
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-3">📭</div>
        <p className="text-sm font-bold text-app-heading uppercase tracking-wide">
          No Pending Applications
        </p>
        <p className="text-sm text-app-muted mt-2 max-w-xs mx-auto">
          Eligible students can apply from the Student Portal. Approved applications will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-black uppercase tracking-wide text-app-heading">
            🗳️ Pending Applications
          </p>
          <p className="text-sm text-app-muted mt-1">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} awaiting election committee review
          </p>
        </div>
        <button
          onClick={loadPending}
          disabled={loading}
          className="rounded-xl border border-app bg-app-input px-3 py-2 text-sm font-bold uppercase tracking-wider text-app-muted hover:text-app-heading hover:bg-app-elevated transition-all cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="space-y-3">
        {candidates.map((c) => {
          const pos = POSITION_LABELS.find(
            (p) => p.value.toLowerCase() === String(c.position).toLowerCase()
          ) || POSITION_LABELS[2];
          const busy = processing[c.id];

          return (
            <div
              key={c.id}
              className="rounded-2xl border border-app bg-app-elevated/40 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center transition-all hover:border-sky-400/20"
            >
              {/* Avatar */}
              <div className="shrink-0 flex items-center justify-center h-14 w-14 rounded-xl border border-app bg-gradient-to-br from-amber-300 via-emerald-500 to-sky-500 text-lg font-black text-slate-950 shadow-sm">
                {c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-app-heading truncate">
                    {c.name}
                  </h4>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-200 bg-amber-400/10 border border-amber-300/25 px-2 py-0.5 rounded">
                    {pos.icon} {pos.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-app-muted">
                  <span className="font-mono">ID: {c.applied_by}</span>
                  <span className="text-emerald-400 capitalize">{c.year} year</span>
                  <span className="text-sky-400 capitalize">{c.gender}</span>
                  <span className="font-mono">{c.wallet_address?.slice(0, 8)}…{c.wallet_address?.slice(-4)}</span>
                </div>
                {c.applied_at && (
                  <p className="text-xs text-app-muted mt-1.5">
                    Applied {new Date(c.applied_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="shrink-0 flex gap-2">
                <button
                  onClick={() => handleAction(c.id, "approve")}
                  disabled={busy}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black uppercase tracking-wider text-slate-950 shadow-neon-glow hover:brightness-110 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {busy === "approve" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                      On-chain…
                    </span>
                  ) : (
                    <span>✓ Approve</span>
                  )}
                </button>
                <button
                  onClick={() => handleAction(c.id, "reject")}
                  disabled={busy}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-black uppercase tracking-wider text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {busy === "reject" ? "…" : "✗ Reject"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}