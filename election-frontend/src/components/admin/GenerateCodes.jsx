import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";

export default function GenerateCodes() {
  const { wallet } = useContext(AuthContext);
  const [studentIdsText, setStudentIdsText] = useState("");
  const [codes, setCodes] = useState([]);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [showUsed, setShowUsed] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
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
    } finally {
      setFetching(false);
    }
  }, [wallet]);

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
      setStudentIdsText("");
      await loadCodes();
    } catch (err) {
      setError(err.message || "Generation failed");
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
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Registration Codes</h3>
        <p className="text-sm text-gray-600">
          Generate unique one-time codes for predefined student IDs. Students must enter their ID + code during registration.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Students</span>
            <span className="ml-1 text-xs text-slate-400">(CSV: ID, name, year, gender — one per line)</span>
          </label>
          <textarea
            ref={textareaRef}
            value={studentIdsText}
            onChange={(e) => setStudentIdsText(e.target.value)}
            rows={5}
            placeholder="GU001,John Doe,1st,male&#10;GU002,Jane Smith,2nd,female&#10;GU003,Ram Thapa,3rd,male"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading || !wallet}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? "Generating…" : "Generate Codes"}
            </button>
            {generatedCodes.length > 0 && (
              <button
                onClick={() => downloadCSV(generatedCodes)}
                className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
              >
                Download CSV ({generatedCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generated summary */}
      {generatedCodes.length > 0 && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">
            Created {generatedCount} code(s). Codes are shown in the table below.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-2xl font-black text-slate-800">
            {codes.length}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-2xl font-black text-amber-700">
            {codes.filter((c) => !c.used).length}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Unused</p>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-2xl font-black text-emerald-700">
            {codes.filter((c) => c.used).length}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Used</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by ID or code…"
          className="flex-1 min-w-[160px] rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={showUsed}
            onChange={(e) => setShowUsed(e.target.checked)}
            className="h-4 w-4"
          />
          Show used
        </label>
        <button
          onClick={() => downloadCSV(codes)}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Download All CSV
        </button>
        <button
          onClick={loadCodes}
          disabled={fetching}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {fetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      {filteredCodes.length === 0 ? (
        <p className="text-slate-500 text-sm">No codes to show.</p>
      ) : (
        <div className="rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Student ID</th>
                <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Code</th>
                <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Created</th>
                <th className="text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Used At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCodes.map((c) => (
                <tr key={c.id} className={c.used ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-3 py-2 font-mono text-slate-700">{c.student_id}</td>
                  <td className="px-3 py-2 font-mono font-semibold tracking-wide text-slate-800">{c.code}</td>
                  <td className="px-3 py-2">
                    {c.used ? (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                        Used
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                        Unused
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
