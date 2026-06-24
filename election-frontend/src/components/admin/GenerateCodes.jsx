import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";
import StatCard from "../ui/StatCard";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";

export default function GenerateCodes() {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError, info } = useToast();
  const [studentIdsText, setStudentIdsText] = useState("");
  const [codes, setCodes] = useState([]);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [showUsed, setShowUsed] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const textareaRef = useRef(null);

  const parseStudents = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    return lines.map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        student_id: cols[0]?.toUpperCase() || "",
        name: cols[1] || "",
        year: cols[2] || "",
        gender: cols[3] || "",
      };
    }).filter((s) => s.student_id);
  };

  const loadCodes = useCallback(async () => {
    if (!wallet) return;
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/codes?limit=200&adminWallet=${wallet}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load codes");
      setCodes(data.codes || []);
    } catch (err) {
      console.error(err);
      showError("Failed to load registration codes");
    } finally {
      setFetching(false);
    }
  }, [wallet, showError]);

  useEffect(() => {
    if (wallet) loadCodes();
  }, [wallet, loadCodes]);

  const handleGenerate = async () => {
    const students = parseStudents(studentIdsText);
    if (students.length === 0) {
      setError("Enter at least one valid student record");
      return;
    }
    setError("");
    setLoading(true);
    setGeneratedCodes([]);
    try {
      const res = await fetch(`${API_URL}/api/admin/generate-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: wallet, students }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGeneratedCodes(data.codes || []);
      setGeneratedCount(data.count || 0);
      setGeneratedMeta({ generated: data.generated || [], reused: data.reused || [], skipped: data.skipped || [] });
      setStudentIdsText("");
      const parts = [];
      if (data.generated?.length) parts.push(`${data.generated.length} new`);
      if (data.reused?.length) parts.push(`${data.reused.length} reused`);
      if (data.skipped?.length) parts.push(`${data.skipped.length} skipped (${data.skipped.map(s => s.reason).join(', ')})`);
      success(`Codes: ${parts.join(', ') || 'none'}`);
      await loadCodes();
    } catch (err) {
      setError(err.message || "Generation failed");
      showError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (rows) => {
    const header = "student_id,code";
    const lines = rows.map((r) => `${r.student_id},${r.code}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registration_codes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    info("CSV download started");
  };

  const filteredCodes = codes.filter((c) => {
    if (!showUsed && c.used) return false;
    const q = filter.trim().toUpperCase();
    if (!q) return true;
    return (
      (c.student_id || "").toUpperCase().includes(q) ||
      (c.code || "").toUpperCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader icon="🔑" title="Registration Codes" />

      <p className="text-sm text-app-body leading-relaxed">
        Generate unique one-time codes linked to voter student IDs. Voters must provide their matched student ID and key to link their Ethereum wallets.
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">Students Database Upload</span>
          <span className="ml-1 text-xs font-mono text-app-muted">(CSV: ID,Name,Year,Gender — one per line)</span>
        </label>
        <textarea
          ref={textareaRef}
          value={studentIdsText}
          onChange={(e) => setStudentIdsText(e.target.value)}
          rows={5}
          placeholder="GU001,John Doe,1st,male&#10;GU002,Jane Smith,2nd,female"
          disabled={loading}
          className="input-field w-full px-4 py-3 text-sm font-mono shadow-sm disabled:opacity-50 min-h-[120px]"
        />
        {error && <p className="text-sm font-mono font-semibold text-rose-400">{error}</p>}

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-2.5">
          <button
            onClick={handleGenerate}
            disabled={loading || !wallet}
            className="btn-primary disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                Generating…
              </>
            ) : (
              <>🔑 Generate Codes</>
            )}
          </button>

          {generatedCodes.length > 0 && (
            <button
              onClick={() => downloadCSV(generatedCodes)}
              className="rounded-xl bg-teal-500 text-slate-950 px-5 py-2.5 text-sm font-black uppercase tracking-wider shadow-neon-glow hover:bg-teal-400 transition-all cursor-pointer"
            >
              📥 Download CSV ({generatedCount})
            </button>
          )}
        </div>
      </div>

      {generatedMeta && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 space-y-1">
          {generatedMeta.generated.length > 0 && (
            <p className="text-sm font-semibold text-emerald-400">✅ Generated {generatedMeta.generated.length} new code(s)</p>
          )}
          {generatedMeta.reused.length > 0 && (
            <p className="text-sm font-semibold text-sky-400">♻️ {generatedMeta.reused.length} code(s) already existed — reused</p>
          )}
          {generatedMeta.skipped.length > 0 && generatedMeta.skipped.map((s, i) => (
            <p key={i} className="text-sm text-amber-400">
              ⏭️ {s.student_id} ({s.name || "no name"}) — {s.reason}
            </p>
          ))}
          <p className="text-xs text-app-muted pt-1">View details in the audit registry below.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Codes" value={codes.length} />
        <StatCard label="Unused" value={codes.filter((c) => !c.used).length} accent="emerald" />
        <StatCard label="Used" value={codes.filter((c) => c.used).length} accent="muted" />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter student ID or code…"
          className="input-field flex-1 min-w-0 text-sm"
        />
        <label className="flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider text-app-muted cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={showUsed}
            onChange={(e) => setShowUsed(e.target.checked)}
            className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
          />
          Show used
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(codes)}
            className="flex-1 sm:flex-none rounded-xl border border-app bg-app-input px-3 sm:px-4 py-2.5 text-sm font-bold text-app-muted hover:text-app-heading hover:bg-app-elevated transition-all cursor-pointer"
          >
            Backup CSV
          </button>
          <button
            onClick={loadCodes}
            disabled={fetching}
            className="flex-1 sm:flex-none rounded-xl border border-app bg-app-input px-3 sm:px-4 py-2.5 text-sm font-bold text-app-muted hover:text-app-heading hover:bg-app-elevated transition-all disabled:opacity-50 cursor-pointer"
          >
            {fetching ? "Syncing…" : "🔄 Sync"}
          </button>
        </div>
      </div>

      {filteredCodes.length === 0 ? (
        <EmptyState icon="🔑" message="No active keys match your query filters." />
      ) : (
        <DataTable
          keyExtractor={(c) => c.id}
          data={filteredCodes}
          rowClassName={(c) => (c.used ? "opacity-60" : "")}
          columns={[
            {
              key: "student_id",
              label: "Voter ID",
              cellClassName: "font-mono text-emerald-400 font-bold",
              render: (c) => c.student_id,
            },
            {
              key: "code",
              label: "Key Code",
              cellClassName: "font-mono font-bold tracking-wider text-app-heading",
              render: (c) => c.code,
            },
            {
              key: "status",
              label: "Status",
              render: (c) =>
                c.used ? (
                  <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-app-elevated border border-app text-app-muted">
                    Claimed
                  </span>
                ) : (
                  <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-neon-glow">
                    Available
                  </span>
                ),
            },
            {
              key: "created_at",
              label: "Issued",
              cellClassName: "font-mono",
              render: (c) => (c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"),
            },
            {
              key: "used_at",
              label: "Claimed At",
              cellClassName: "font-mono",
              render: (c) => (c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"),
            },
          ]}
        />
      )}
    </div>
  );
}