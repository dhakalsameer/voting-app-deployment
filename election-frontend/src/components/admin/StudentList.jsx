import { useEffect, useState, useCallback, useContext } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";
import StatCard from "../ui/StatCard";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";

function StatusBadge({ eligibleToVote, registered }) {
  if (eligibleToVote) {
    return (
      <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-neon-glow">
        Verified
      </span>
    );
  }
  if (registered) {
    return (
      <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
        Registered
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-[#0d1510] border border-[#1e3a2b] text-slate-500">
      Awaiting Link
    </span>
  );
}

export default function StudentList() {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState("");

  const handleLoadData = useCallback(async () => {
    if (!wallet) return;
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/admin/students?adminWallet=${wallet}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load students");
      setStudents(data.students || []);
    } catch (err) {
      console.error(err);
      showError("Failed to load students");
    } finally {
      setFetching(false);
    }
  }, [wallet, showError]);

  const handleDelete = async (studentId) => {
    if (!studentId) return;
    const ok = window.confirm(`Permanently delete student ${studentId}? This will remove them from the database.`);
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/students/${studentId}?adminWallet=${wallet}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setStudents((prev) => prev.filter((s) => s.student_id !== studentId));
      success(`Deleted student ${studentId}`);
    } catch (err) {
      showError(err.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAsCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      try {
        const rows = parseCSV(text);
        const csvStudents = rows
          .map((r) => ({
            student_id: String(r.student_id || "").trim().toUpperCase(),
            name: r.name ? String(r.name).trim() : null,
            year: r.year ? String(r.year).trim().toLowerCase() : null,
            gender: r.gender ? String(r.gender).trim().toLowerCase() : null,
          }))
          .filter((s) => s.student_id);

        if (csvStudents.length === 0) {
          showError("No valid student records found in CSV");
          return;
        }

        const res = await fetch(`${API_URL}/api/admin/generate-codes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminWallet: wallet, students: csvStudents }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        success(`Created/updated ${data.count} student(s) from CSV. Registration codes generated.`);
        await handleLoadData();
      } catch (err) {
        showError(err.message || "CSV upload failed");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Auto-load once when wallet becomes available (async, no sync setState)
  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetch(`${API_URL}/api/auth/admin/students?adminWallet=${wallet}`)
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load students");
        setStudents(data.students || []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          showError("Failed to load students");
        }
      });
    return () => { cancelled = true; };
  }, [wallet, showError]);

  const filtered = students.filter((s) => {
    const q = filter.trim().toUpperCase();
    if (!q) return true;
    return (s.student_id || "").toUpperCase().includes(q) || (s.name || "").toUpperCase().includes(q);
  });

  const verifiedCount = students.filter((s) => s.eligibleToVote).length;
  const total = students.length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader icon="🎓" title="Student Registry" subtitle="View & Manage Records" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total" value={total} />
        <StatCard label="Verified" value={verifiedCount} accent="emerald" />
        <StatCard label="Registered" value={students.filter((s) => s.registered && !s.eligibleToVote).length} accent="amber" />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search student ID or name…"
          className="input-field flex-1 min-w-0 text-sm"
        />
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleLoadData}
            disabled={fetching}
            className="flex-1 sm:flex-none rounded-xl border border-app bg-app-input px-4 sm:px-5 py-2.5 text-sm font-bold text-app-muted hover:text-app-heading hover:bg-app-elevated transition-all cursor-pointer disabled:opacity-50"
          >
            {fetching ? "Refreshing…" : "🔄 Refresh"}
          </button>
          <label className="flex-1 sm:flex-none rounded-xl bg-emerald-500 text-slate-950 px-4 sm:px-5 py-2.5 text-sm font-black uppercase tracking-wider shadow-neon-glow hover:bg-emerald-400 text-center cursor-pointer">
            📥 Load CSV
            <input type="file" accept=".csv" onChange={handleLoadAsCSV} className="hidden" />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🎓"
          message={students.length === 0 ? "No student records currently cached." : "No matching student profiles."}
        />
      ) : (
        <DataTable
          keyExtractor={(s) => s.id || s.student_id}
          data={filtered}
          columns={[
            {
              key: "student_id",
              label: "Student ID",
              cellClassName: "font-mono text-emerald-400 font-bold",
              render: (s) => s.student_id,
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
              key: "status",
              label: "Status",
              render: (s) => <StatusBadge eligibleToVote={s.eligibleToVote} registered={s.registered} />,
            },
            {
              key: "created_at",
              label: "Created",
              cellClassName: "font-mono",
              render: (s) => (s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"),
            },
            {
              key: "actions",
              label: "Action",
              align: "right",
              render: (s) => (
                <button
                  onClick={() => handleDelete(s.student_id)}
                  disabled={loading}
                  className="rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-40"
                >
                  Delete
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect header row and skip it
  let startIndex = 0;
  const firstCols = lines[0].split(",").map((c) => c.trim().toUpperCase());
  if (firstCols.includes("STUDENT_ID") || firstCols.includes("ID") || firstCols.includes("NAME")) {
    startIndex = 1;
  }

  return lines.slice(startIndex).map((row) => {
    const cols = row.split(",").map((c) => c.trim());
    return {
      student_id: cols[0] || "",
      name: cols[1] || "",
      year: cols[2] || "",
      gender: cols[3] || "",
    };
  });
}