import { useEffect, useState } from "react";
import { API_URL } from "../../config";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";
import BlockExplorerLink from "../ui/BlockExplorerLink";
import EmptyState from "../ui/EmptyState";

export default function GasHistory() {
  const { error: showError } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadHistory = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/distribution/history?page=${p}&limit=20`);
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch (err) {
      showError(err.message || "Could not load distribution history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader icon="📋" title="Distribution History" />

      {loading ? (
        <div className="text-center py-12 text-sm text-app-muted animate-pulse">Loading history…</div>
      ) : logs.length === 0 ? (
        <EmptyState message="No distribution records yet." icon="📭" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-app">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-app-elevated/80 backdrop-blur text-app-muted uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Wallet</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Tx Hash</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-app/50 hover:bg-app-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-app-body">{log.student_id}</td>
                    <td className="px-4 py-3 font-mono text-app-muted">
                      {log.wallet_address.slice(0, 6)}…{log.wallet_address.slice(-4)}
                    </td>
                    <td className="px-4 py-3 font-mono text-app-heading">{log.amount_eth} ETH</td>
                    <td className="px-4 py-3">
                      {log.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold" title={log.error}>
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {log.tx_hash ? (
                        <BlockExplorerLink hash={log.tx_hash} />
                      ) : (
                        <span className="text-app-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-app-muted text-xs">
                      {new Date(log.distributed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-app-muted">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadHistory(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-app bg-app-surface text-app-heading hover:bg-app-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => loadHistory(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-app bg-app-surface text-app-heading hover:bg-app-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
