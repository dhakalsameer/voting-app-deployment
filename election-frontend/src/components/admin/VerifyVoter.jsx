import { useState, useEffect, useContext, useCallback } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";
import StatCard from "../ui/StatCard";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";

export default function VerifyVoter() {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError } = useToast();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const isAdmin = Boolean(wallet);

  const handleLoadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/admin/students?adminWallet=${wallet}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load students");
      setStudents(data.students || []);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      showError("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, wallet, showError]);

  // Auto-load once when wallet becomes available (async, no sync setState)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch(`${API_URL}/api/auth/admin/students?adminWallet=${wallet}`)
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load students");
        setStudents(data.students || []);
        setSelected(new Set());
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          showError("Failed to load students");
        }
      });
    return () => { cancelled = true; };
  }, [isAdmin, wallet, showError]);

  const toggleStudent = (studentId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const verifyStudent = async (studentId) => {
    try {
      const res = await fetch(`${API_URL}/api/voters/verify-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: [studentId], version: "v3", adminWallet: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      success(`Verified ${studentId}${data.txHash ? `. Tx: ${data.txHash.slice(0, 8)}…${data.txHash.slice(-6)}` : ""}`);
      await handleLoadData();
    } catch (err) {
      showError(err.message || "Verification failed");
    }
  };

  const verifySelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      showError("Select at least one student to verify");
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/voters/verify-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: ids, version: "v3", adminWallet: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch verification failed");
      success(`Verified ${data.verifiedCount || ids.length} student(s)${data.txHash ? `. Tx: ${data.txHash.slice(0, 8)}…${data.txHash.slice(-6)}` : ""}`);
      setSelected(new Set());
      await handleLoadData();
    } catch (err) {
      showError(err.message || "Verification failed");
    } finally {
      setVerifyLoading(false);
    }
  };

  const revokeStudent = async (studentId) => {
    const ok = window.confirm(`Permanently revoke ${studentId}? This cannot be undone.`);
    if (!ok) return;
    setRevokeLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/voters/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, adminWallet: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      success(`Revoked ${studentId}${data.txHash ? `. Tx: ${data.txHash.slice(0, 8)}…${data.txHash.slice(-6)}` : ""}`);
      await handleLoadData();
    } catch (err) {
      showError(err.message || "Revoke failed");
    } finally {
      setRevokeLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    const q = filter.trim().toUpperCase();
    if (!q) return true;
    return (s.student_id || "").toUpperCase().includes(q) || (s.name || "").toUpperCase().includes(q);
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader icon="✓" title="Verify Voters" subtitle="Whitelist & Revoke" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Registry" value={students.length} />
        <StatCard label="Selected" value={selected.size} accent="emerald" />
        <StatCard label="Active Whitelisted" value={students.filter((s) => s.eligibleToVote).length} accent="emerald" />
      </div>

      {!isAdmin ? (
        <EmptyState icon="🔐" message="Connect your admin wallet to manage voter verification." />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search student ID or name…"
              className="input-field flex-1 min-w-0 text-sm"
            />
            <button
              onClick={handleLoadData}
              disabled={loading}
              className="rounded-xl border border-app bg-app-input px-4 sm:px-5 py-2.5 text-sm font-bold text-app-muted hover:text-app-heading hover:bg-app-elevated transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "🔄 Refresh Data"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-2.5">
            <button
              onClick={verifySelected}
              disabled={verifyLoading || selected.size === 0}
              className="rounded-xl bg-emerald-500 text-slate-950 px-4 sm:px-5 py-2.5 text-sm font-black uppercase tracking-wider shadow-neon-glow hover:bg-emerald-400 hover:shadow-neon-intense transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {verifyLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                  Whitelisting…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">✅ Whitelist Selected ({selected.size})</span>
              )}
            </button>

            <button
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="rounded-xl border border-app bg-app-input px-4 py-2.5 text-sm font-bold text-app-muted hover:text-app-heading hover:bg-app-elevated transition-all disabled:opacity-40 cursor-pointer"
            >
              Clear Selection
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="👥" message={loading ? "Loading database..." : "No unverified student links found."} />
          ) : (
            <>
              <label className="hidden md:flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider text-app-muted cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((s) => selected.has(s.student_id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(filtered.map((s) => s.student_id)));
                    } else {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        filtered.forEach((s) => next.delete(s.student_id));
                        return next;
                      });
                    }
                  }}
                  className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                />
                Select all visible ({filtered.length})
              </label>
              <DataTable
              keyExtractor={(s) => s.student_id}
              data={filtered}
              columns={[
                {
                  key: "select",
                  label: "Select",
                  hideOnMobile: true,
                  render: (s) => (
                    <input
                      type="checkbox"
                      checked={selected.has(s.student_id)}
                      onChange={() => toggleStudent(s.student_id)}
                      className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                      aria-label={`Select ${s.student_id}`}
                    />
                  ),
                },
                {
                  key: "student_id",
                  label: "ID",
                  cellClassName: "font-mono text-emerald-400 font-bold",
                  render: (s) => (
                    <div className="flex items-center gap-2 md:block">
                      <input
                        type="checkbox"
                        checked={selected.has(s.student_id)}
                        onChange={() => toggleStudent(s.student_id)}
                        className="h-4 w-4 accent-emerald-500 rounded cursor-pointer md:hidden shrink-0"
                        aria-label={`Select ${s.student_id}`}
                      />
                      {s.student_id}
                    </div>
                  ),
                },
                {
                  key: "name",
                  label: "Name",
                  cellClassName: "font-bold text-app-heading",
                  render: (s) => s.name || "—",
                },
                {
                  key: "year",
                  label: "Year",
                  render: (s) => s.registration_year || s.year || "—",
                },
                {
                  key: "gender",
                  label: "Gender",
                  render: (s) => (s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : "—"),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (s) =>
                    s.eligibleToVote ? (
                      <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-neon-glow">
                        Whitelisted
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-app-input border border-app text-app-muted">
                        Awaiting
                      </span>
                    ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  align: "right",
                  render: (s) => (
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {s.registered && s.walletVerified && !s.eligibleToVote && (
                        <button
                          onClick={() => verifyStudent(s.student_id)}
                          disabled={verifyLoading}
                          className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                        >
                          Verify
                        </button>
                      )}
                      {s.eligibleToVote && (
                        <button
                          onClick={() => revokeStudent(s.student_id)}
                          disabled={revokeLoading}
                          className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
            </>
          )}
        </>
      )}
    </div>
  );
}