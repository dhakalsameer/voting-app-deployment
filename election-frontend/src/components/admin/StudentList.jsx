import { useState, useEffect, useContext } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";

const YEARS = ["1st", "2nd", "3rd", "4th"];
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function StudentList() {
  const { wallet } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchStudents = async () => {
    if (!wallet) return;
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_URL}/api/auth/admin/students`);
      url.searchParams.append("adminWallet", wallet);
      if (yearFilter) url.searchParams.append("year", yearFilter);
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load students");
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet) fetchStudents();
  }, [yearFilter, wallet]);

  const startEdit = (s) => {
    setEditingId(s.student_id);
    setEditForm({
      name: s.name || "",
      year: s.year || "",
      gender: s.gender || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (studentId) => {
    if (!wallet) return;
    setSaving(true);
    setError("");
    try {
      const url = new URL(`${API_URL}/api/auth/admin/students/${studentId}`);
      url.searchParams.append("adminWallet", wallet);
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setStudents((prev) =>
        prev.map((s) => (s.student_id === studentId ? data : s))
      );
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!wallet) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Registered Students</h3>
        <p className="text-sm text-slate-500">
          Please connect your MetaMask wallet to view and manage students.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">
          Registered Students ({students.length})
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase text-slate-500">
            Filter by Year
          </label>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y} year
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading students…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-slate-500">
          No registered students{yearFilter ? ` for ${yearFilter} year` : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Year</th>
                <th className="py-2 pr-3">Gender</th>
                <th className="py-2 pr-3">Wallet</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.student_id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-2 pr-3 font-mono text-xs">{s.student_id}</td>
                  {editingId === s.student_id ? (
                    <>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={editForm.year}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, year: e.target.value }))
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={editForm.gender}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              gender: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {GENDERS.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-slate-500">
                        {s.wallet_address
                          ? `${s.wallet_address.slice(0, 6)}…${s.wallet_address.slice(-4)}`
                          : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveEdit(s.student_id)}
                            disabled={saving}
                            className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-3 font-semibold">{s.name}</td>
                      <td className="py-2 pr-3">{s.year ? `${s.year} year` : "—"}</td>
                      <td className="py-2 pr-3 capitalize">
                        {s.gender || "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-slate-500">
                        {s.wallet_address
                          ? `${s.wallet_address.slice(0, 6)}…${s.wallet_address.slice(-4)}`
                          : "—"}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
