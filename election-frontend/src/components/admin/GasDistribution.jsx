import { useEffect, useState, useContext, useRef } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";
import { useBalance } from "../../hooks/useBalance";
import { useToast } from "../ui/Toast";
import BlockExplorerLink from "../ui/BlockExplorerLink";
import GasHistory from "./GasHistory";

const GAS_TABS = [
  { id: "distribute", label: "Distribute", icon: "⛽" },
  { id: "history", label: "History", icon: "📋" },
];

export default function GasDistribution() {
  const [subTab, setSubTab] = useState("distribute");
  const [subStuck, setSubStuck] = useState(false);
  const subSentinelRef = useRef(null);

  useEffect(() => {
    const el = subSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setSubStuck(!entry.isIntersecting),
      { rootMargin: "-160px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-app-heading">
            ⛽ Sepolia ETH Distribution
          </h3>
          <p className="text-sm text-app-muted mt-1">
            Send test ETH to verified voters by year group. Only eligible students (wallet linked + verified) are shown.
          </p>
        </div>
      </div>

      <div ref={subSentinelRef} className="h-px" />
      <div className={`flex gap-3 mb-6 pb-5 border-b border-app overflow-x-auto sticky top-[10rem] z-20 transition-all duration-200 ${subStuck ? "bg-app-background/80 backdrop-blur-sm" : "bg-transparent"} -mx-6 px-6`}>
        {GAS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-base font-semibold transition-all cursor-pointer whitespace-nowrap ${
              subTab === t.id
                ? "text-app-accent bg-app-accent-soft shadow-sm"
                : "text-app-muted-text hover:text-app-heading hover:bg-app-muted/30"
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "distribute" && <GasDistribute />}
      {subTab === "history" && <GasHistory />}
    </div>
  );
}

function GasDistribute() {
  const { wallet } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const { success, error: showError, info } = useToast();
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedYears, setSelectedYears] = useState([]);
  const [amount, setAmount] = useState("0.002");
  const [distributing, setDistributing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/api/distribution/stats`);
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data.years || []);
    } catch (err) {
      showError(err.message || "Could not load distribution stats");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const toggleYear = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
    setPreview(null);
    setResults(null);
  };

  const selectedCount = stats
    .filter((s) => selectedYears.includes(s.year))
    .reduce((sum, s) => sum + Number(s.eligible_count || 0), 0);

  const totalEth = selectedCount * parseFloat(amount || 0);
  const adminBalance = balance ? parseFloat(balance) : 0;
  const hasEnough = adminBalance >= totalEth + 0.01;
  const canSend = selectedCount > 0 && parseFloat(amount) > 0 && wallet;

  const runDistribution = async (dryRun) => {
    if (!wallet) {
      showError("Connect your MetaMask wallet first.");
      return;
    }
    if (selectedYears.length === 0) {
      showError("Select at least one year group.");
      return;
    }
    if (!dryRun && !hasEnough) {
      showError(
        `Admin balance (${adminBalance.toFixed(4)} ETH) is insufficient. Need ${(totalEth + 0.01).toFixed(4)} ETH.`
      );
      return;
    }

    setDistributing(true);
    setPreview(null);
    setResults(null);

    try {
      const res = await fetch(`${API_URL}/api/distribution/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          years: selectedYears,
          amount: amount,
          dryRun,
          adminWallet: wallet,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Distribution request failed");
      }

      if (dryRun) {
        setPreview(data);
        info(`Dry run: ${data.totalRecipients} recipient(s), ${data.totalEth} ETH total`);
      } else {
        setResults(data);
        success(
          `Distribution complete! ${data.sent} sent, ${data.failed} failed. Total: ${data.totalEth} ETH`
        );
      }
    } catch (err) {
      showError(err.message || "Distribution failed");
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="space-y-6">
      {balance && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-sm font-mono font-bold text-amber-200 w-fit">
          <span>Ξ</span>
          <span>{Number(balance).toFixed(4)} ETH</span>
        </div>
      )}

      {/* Year Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loadingStats ? (
          <div className="col-span-full text-center py-8 text-app-muted text-xs animate-pulse">
            Loading voter stats…
          </div>
        ) : stats.length === 0 ? (
          <div className="col-span-full text-center py-8 text-app-muted text-xs">
            No students with linked wallets found.
          </div>
        ) : (
          stats.map((s) => {
            const selected = selectedYears.includes(s.year);
            const disabled = Number(s.eligible_count || 0) === 0;
            return (
              <button
                key={s.year}
                type="button"
                onClick={() => !disabled && toggleYear(s.year)}
                disabled={disabled}
                className={`relative text-left rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  disabled
                    ? "border-app/50 bg-app-muted/30 opacity-50 cursor-not-allowed"
                    : selected
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-neon-glow"
                    : "border-app bg-app-elevated/40 hover:border-sky-400/30 hover:bg-app-elevated/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wide text-app-heading">
                    {s.year === "Unknown" ? "No Year" : `${s.year} Year`}
                  </span>
                  {selected && (
                    <span className="text-emerald-400 text-lg">✓</span>
                  )}
                </div>
                <div className="text-sm text-app-muted space-y-1">
                  <p>
                    <span className="font-bold text-app-body">{s.wallet_count}</span> wallets linked
                  </p>
                  <p>
                    <span className="font-bold text-emerald-400">{s.eligible_count}</span> eligible to vote
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Amount + Summary */}
      {selectedYears.length > 0 && (
        <div className="rounded-2xl border border-app bg-app-elevated/30 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-black uppercase tracking-widest text-app-muted mb-1.5">
                Amount per Student
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setPreview(null);
                    setResults(null);
                  }}
                  className="flex-1 rounded-xl border border-app bg-app-input px-3 py-2 text-xs font-mono text-app-heading focus:outline-none focus:ring-1 focus:ring-sky-400/40"
                />
                <span className="text-sm font-bold text-app-muted uppercase">ETH</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-sm font-black uppercase tracking-widest text-app-muted mb-1">
                Summary
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-app-body">
                  <span className="font-bold text-emerald-400">{selectedCount}</span> recipients
                </span>
                <span className="text-app-body">
                  <span className="font-bold text-amber-300">{totalEth.toFixed(4)}</span> ETH total
                </span>
                <span className="text-app-body">
                  <span className="font-bold text-sky-400">{Number(amount).toFixed(4)}</span> ETH each
                </span>
              </div>
            </div>
          </div>

          {!hasEnough && balance && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Insufficient balance. Admin has {Number(balance).toFixed(4)} ETH but needs approximately{" "}
                {(totalEth + 0.01).toFixed(4)} ETH (including buffer).
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => runDistribution(true)}
              disabled={!canSend || distributing}
              className="flex-1 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-300 hover:bg-sky-400/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {distributing && preview === null && results === null ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-sky-300/30 border-t-sky-300 rounded-full animate-spin inline-block" />
                  Simulating…
                </span>
              ) : (
                "🧪 Dry Run"
              )}
            </button>
            <button
              onClick={() => runDistribution(false)}
              disabled={!canSend || distributing || !hasEnough}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-400 text-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest shadow-neon-glow hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {distributing && preview === null && results === null ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                  Sending…
                </span>
              ) : (
                "🔥 Send Sepolia ETH"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dry Run Preview */}
      {preview && (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wide text-sky-300 flex items-center gap-2">
            <span>🧪</span> Dry Run Preview
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl border border-app bg-app-elevated/40 p-3">
              <p className="text-app-muted uppercase tracking-wider">Recipients</p>
              <p className="text-lg font-black text-app-heading mt-1">{preview.totalRecipients}</p>
            </div>
            <div className="rounded-xl border border-app bg-app-elevated/40 p-3">
              <p className="text-app-muted uppercase tracking-wider">Total ETH</p>
              <p className="text-lg font-black text-amber-300 mt-1">{preview.totalEth}</p>
            </div>
            <div className="rounded-xl border border-app bg-app-elevated/40 p-3">
              <p className="text-app-muted uppercase tracking-wider">Per Student</p>
              <p className="text-lg font-black text-sky-300 mt-1">{preview.amountPerVoter}</p>
            </div>
            <div className="rounded-xl border border-app bg-app-elevated/40 p-3">
              <p className="text-app-muted uppercase tracking-wider">Admin Balance</p>
              <p className="text-lg font-black text-emerald-300 mt-1">{preview.adminBalance}</p>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-app bg-app-elevated/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-app-elevated/80 backdrop-blur text-app-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Year</th>
                  <th className="text-left px-3 py-2">Wallet</th>
                </tr>
              </thead>
              <tbody>
                {preview.recipients.map((r) => (
                  <tr key={r.student_id} className="border-t border-app/50">
                    <td className="px-3 py-2 text-app-body font-mono">{r.student_id}</td>
                    <td className="px-3 py-2 text-app-body">{r.year}</td>
                    <td className="px-3 py-2 font-mono text-app-muted">
                      {r.wallet_address.slice(0, 6)}…{r.wallet_address.slice(-4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Results */}
      {results && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wide text-emerald-300 flex items-center gap-2">
            <span>✅</span> Distribution Results
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl border border-app bg-app-elevated/40 p-3">
              <p className="text-app-muted uppercase tracking-wider">Recipients</p>
              <p className="text-lg font-black text-app-heading mt-1">{results.totalRecipients}</p>
            </div>
            <div className="rounded-xl border border-app bg-app-elevated/40 p-3">
              <p className="text-app-muted uppercase tracking-wider">Total ETH</p>
              <p className="text-lg font-black text-amber-300 mt-1">{results.totalEth}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-emerald-400 uppercase tracking-wider">Sent</p>
              <p className="text-lg font-black text-emerald-300 mt-1">{results.sent}</p>
            </div>
            {results.failed > 0 && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                <p className="text-rose-400 uppercase tracking-wider">Failed</p>
                <p className="text-lg font-black text-rose-300 mt-1">{results.failed}</p>
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-app bg-app-elevated/30">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-app-elevated/80 backdrop-blur text-app-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Year</th>
                  <th className="text-left px-3 py-2">Tx Hash</th>
                  <th className="text-left px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i} className="border-t border-app/50">
                    <td className="px-3 py-2">
                      {r.status === "sent" ? (
                        <span className="text-emerald-400 font-bold">✓ Sent</span>
                      ) : (
                        <span className="text-rose-400 font-bold">✗ Failed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-app-body font-mono">{r.student_id}</td>
                    <td className="px-3 py-2 text-app-body">{r.year}</td>
                    <td className="px-3 py-2 font-mono">
                      {r.tx_hash ? (
                        <BlockExplorerLink hash={r.tx_hash} />
                      ) : (
                        <span className="text-app-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-rose-300 max-w-[150px] truncate" title={r.error}>
                      {r.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
