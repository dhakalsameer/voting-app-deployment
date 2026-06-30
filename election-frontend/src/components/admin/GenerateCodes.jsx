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
  const [sort, setSort] = useState("recent");
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
      (c.name || "").toUpperCase().includes(q) ||
      (c.code || "").toUpperCase().includes(q)
    );
  });

  const sortedCodes = [...filteredCodes].sort((a, b) => {
    if (sort === "recent") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (sort === "status") {
      return (a.used === b.used) ? 0 : a.used ? 1 : -1;
    }
    return (a.student_id || "").localeCompare(b.student_id || "");
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon="🔑" title="Registration Codes" />

      {/* Generate card */}
      <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
        <div className="px-6 py-5 border-b border-app bg-app-muted/20">
          <h3 className="text-base font-bold text-app-heading">Generate New Codes</h3>
          <p className="text-sm text-app-muted-text mt-1">
            Paste comma-separated student records below. Each student gets a unique one-time registration code.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-app-heading mb-2">
              Student Records
              <span className="text-xs font-mono text-app-muted-text font-normal">(ID, Name, Year, Gender — one per line)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={studentIdsText}
              onChange={(e) => setStudentIdsText(e.target.value)}
              rows={4}
              placeholder="GU001,John Doe,1st,male"
              disabled={loading}
              className="input-field w-full px-4 py-3 text-sm font-mono disabled:opacity-50"
            />
            {error && <p className="mt-2 text-sm font-medium text-rose-400">{error}</p>}
          </div>

          <div className="flex items-center gap-3">
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
                <>Generate Codes</>
              )}
            </button>

            {generatedCodes.length > 0 && (
              <button
                onClick={() => downloadCSV(generatedCodes)}
                className="rounded-xl border border-app bg-app-input px-5 py-2.5 text-sm font-bold text-app-heading hover:bg-app-elevated transition-all cursor-pointer"
              >
                📥 Download CSV ({generatedCount})
              </button>
            )}
          </div>

          {generatedMeta && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-1">
              {generatedMeta.generated.length > 0 && (
                <p className="text-sm font-medium text-emerald-400">+ {generatedMeta.generated.length} new code(s) created</p>
              )}
              {generatedMeta.reused.length > 0 && (
                <p className="text-sm font-medium text-sky-400">↻ {generatedMeta.reused.length} code(s) reused from existing</p>
              )}
              {generatedMeta.skipped.length > 0 && generatedMeta.skipped.map((s, i) => (
                <p key={i} className="text-sm text-amber-400">
                  ⏭ {s.student_id} — {s.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Codes" value={codes.length} />
        <StatCard label="Unused" value={codes.filter((c) => !c.used).length} accent="emerald" />
        <StatCard label="Used" value={codes.filter((c) => c.used).length} accent="muted" />
      </div>

      {/* Filter + actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-app-muted-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by student ID or code…"
            className="input-field w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-app bg-app-input px-3 py-2.5 text-sm text-app-muted-text hover:text-app-heading cursor-pointer focus:outline-none"
        >
          <option value="recent">By Recent</option>
          <option value="status">By Status</option>
          <option value="id">By ID</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-app-muted-text cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={showUsed}
            onChange={(e) => setShowUsed(e.target.checked)}
            className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
          />
          Show used
        </label>
        <button
          onClick={() => downloadCSV(codes)}
          className="rounded-lg border border-app bg-app-input px-4 py-2.5 text-sm font-medium text-app-muted-text hover:text-app-heading hover:bg-app-elevated transition-all cursor-pointer"
        >
          Backup CSV
        </button>
        <button
          onClick={loadCodes}
          disabled={fetching}
          className="rounded-lg border border-app bg-app-input px-4 py-2.5 text-sm font-medium text-app-muted-text hover:text-app-heading hover:bg-app-elevated transition-all disabled:opacity-50 cursor-pointer"
        >
          {fetching ? "Syncing…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      {sortedCodes.length === 0 ? (
        <EmptyState icon="🔑" message="No registration codes match your filters." />
      ) : (
        <DataTable
          keyExtractor={(c) => c.id}
          data={sortedCodes}
          rowClassName={(c) => (c.used ? "opacity-60" : "")}
          columns={[
            {
              key: "student_id",
              label: "Voter ID",
              cellClassName: "font-mono text-emerald-400 font-bold",
              render: (c) => c.student_id,
            },
            {
              key: "name",
              label: "Name",
              cellClassName: "font-medium text-app-heading",
              render: (c) => c.name || "—",
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
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-app-elevated border border-app text-app-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-app-muted" />
                    Claimed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Available
                  </span>
                ),
            },
            {
              key: "created_at",
              label: "Issued",
              cellClassName: "font-mono text-sm",
              render: (c) => (c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"),
            },
            {
              key: "used_at",
              label: "Claimed At",
              cellClassName: "font-mono text-sm",
              render: (c) => (c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"),
            },
          ]}
        />
      )}
    </div>
  );
}
