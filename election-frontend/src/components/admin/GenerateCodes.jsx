import { useState, useContext, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContextValue";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";
import StatCard from "../ui/StatCard";
import EmptyState from "../ui/EmptyState";
import DataTable from "../ui/DataTable";
import StudentSpreadsheet from "./StudentSpreadsheet";

const COLUMN_ALIASES = {
  student_id: ["student_id", "studentid", "id", "voter_id", "voterid", "voter", "roll_no", "rollno", "roll number", "enrollment", "enrollment_no"],
  name: ["name", "full_name", "fullname", "student_name", "studentname", "display_name"],
  year: ["year", "academic_year", "academicyear", "level", "class", "grade", "batch"],
  gender: ["gender", "sex"],
  email: ["email", "e_mail", "mail", "email_address"],
};

function findColumn(headers, aliases) {
  const lower = headers.map((h) => String(h).trim().toLowerCase().replace(/[^a-z0-9_]/g, ""));
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseFile(buffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) return [];

  const headers = rows[0];
  const colIdx = {
    student_id: findColumn(headers, COLUMN_ALIASES.student_id),
    name: findColumn(headers, COLUMN_ALIASES.name),
    year: findColumn(headers, COLUMN_ALIASES.year),
    gender: findColumn(headers, COLUMN_ALIASES.gender),
    email: findColumn(headers, COLUMN_ALIASES.email),
  };

  if (colIdx.student_id === -1) return [];

  const students = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c).trim() === "")) continue;

    const student_id = String(row[colIdx.student_id] ?? "").trim();
    if (!student_id || seen.has(student_id.toUpperCase())) continue;
    seen.add(student_id.toUpperCase());

    students.push({
      student_id,
      name: colIdx.name !== -1 ? String(row[colIdx.name] ?? "").trim() : "",
      year: colIdx.year !== -1 ? String(row[colIdx.year] ?? "").trim() : "",
      gender: colIdx.gender !== -1 ? String(row[colIdx.gender] ?? "").trim() : "",
      email: colIdx.email !== -1 ? String(row[colIdx.email] ?? "").trim() : "",
    });
  }

  return students;
}

const INPUT_TABS = [
  { id: "manual", label: "Manual Entry", icon: "⌨️" },
  { id: "spreadsheet", label: "Spreadsheet", icon: "📊" },
  { id: "upload", label: "Upload File", icon: "📄" },
];

export default function GenerateCodes() {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError, info } = useToast();

  // Tab state
  const [inputTab, setInputTab] = useState("manual");

  // Manual entry state
  const [studentIdsText, setStudentIdsText] = useState("");
  const [error, setError] = useState("");

  // File upload state
  const [file, setFile] = useState(null);
  const [previewStudents, setPreviewStudents] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Shared state
  const [codes, setCodes] = useState([]);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [rebuildingRoot, setRebuildingRoot] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [filter, setFilter] = useState("");
  const [showUsed, setShowUsed] = useState(false);
  const [sort, setSort] = useState("recent");
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const [merkleRoot, setMerkleRoot] = useState(null);
  const [chainMerkleRoot, setChainMerkleRoot] = useState(null);
  const [reminderConfig, setReminderConfig] = useState(null);
  const [pendingStats, setPendingStats] = useState({ total: 0, with_email: 0 });
  const [sendingReminder, setSendingReminder] = useState(false);
  const [togglingReminder, setTogglingReminder] = useState(false);
  const [sendingEmailMap, setSendingEmailMap] = useState({});
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
        email: cols[4] || "",
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

  const loadReminderConfig = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/reminder-config?adminWallet=${wallet}`);
      if (res.ok) setReminderConfig(await res.json());
    } catch (_) {}
  }, [wallet]);

  const loadPendingStats = useCallback(async () => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/pending-codes?adminWallet=${wallet}`);
      if (res.ok) setPendingStats(await res.json());
    } catch (_) {}
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      loadReminderConfig();
      loadPendingStats();
    }
  }, [wallet, loadReminderConfig, loadPendingStats]);

  const handleGenerate = async () => {
    const students = parseStudents(studentIdsText);
    if (students.length === 0) {
      setError("Enter at least one valid student record");
      return;
    }
    setError("");
    setLoading(true);
    setGeneratedCodes([]);
    setGeneratedMeta(null);
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
      setMerkleRoot(data.merkleRoot || null);
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

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setPreviewError("");
    setPreviewStudents([]);
    setGeneratedMeta(null);

    if (!selectedFile) return;

    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      setPreviewError("Unsupported file type. Upload .xlsx, .xls, or .csv");
      setFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const students = parseFile(e.target.result);
        if (students.length === 0) {
          setPreviewError("No valid student records found. Make sure the file has a header row with a student ID column.");
          return;
        }
        setPreviewStudents(students);
      } catch (err) {
        setPreviewError("Failed to parse file: " + err.message);
      }
    };
    reader.onerror = () => {
      setPreviewError("Failed to read file");
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || previewStudents.length === 0) {
      setPreviewError("No valid students to upload");
      return;
    }

    setUploading(true);
    setGeneratedCodes([]);
    setGeneratedMeta(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("adminWallet", wallet);

      const res = await fetch(`${API_URL}/api/admin/upload-codes`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setGeneratedCodes(data.codes || []);
      setGeneratedCount(data.count || 0);
      setGeneratedMeta({ generated: data.generated || [], reused: data.reused || [], skipped: data.skipped || [] });
      setMerkleRoot(data.merkleRoot || null);
      setFile(null);
      setPreviewStudents([]);
      const parts = [];
      if (data.generated?.length) parts.push(`${data.generated.length} new`);
      if (data.reused?.length) parts.push(`${data.reused.length} reused`);
      if (data.skipped?.length) parts.push(`${data.skipped.length} skipped (${data.skipped.map(s => s.reason).join(', ')})`);
      success(`Upload: ${parts.join(', ') || 'none'}`);
      await loadCodes();
    } catch (err) {
      setPreviewError(err.message || "Upload failed");
      showError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRebuildRoot = async () => {
    setRebuildingRoot(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/rebuild-regcode-merkle-root`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rebuild failed");
      setMerkleRoot(data.merkleRoot);
      success("Merkle root rebuilt on-chain");
    } catch (err) {
      showError(err.message);
    } finally {
      setRebuildingRoot(false);
    }
  };

  const handleToggleReminder = async () => {
    if (!reminderConfig) return;
    setTogglingReminder(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/reminder-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: wallet, enabled: !reminderConfig.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setReminderConfig(data);
      success(data.enabled ? "Auto reminders enabled" : "Auto reminders disabled");
    } catch (err) {
      showError(err.message);
    } finally {
      setTogglingReminder(false);
    }
  };

  const handleSendReminderNow = async () => {
    setSendingReminder(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/send-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reminders");
      if (data.devMode) {
        info(data.message || "Reminders logged to console (SMTP not configured)");
      } else {
        success(data.message || `Reminders sent to ${data.sent.length} student(s)`);
      }
      if (data.failed?.length) {
        showError(`${data.failed.length} failed: ${data.failed.map(f => `${f.student_id} (${f.reason})`).join(", ")}`);
      }
      loadPendingStats();
    } catch (err) {
      showError(err.message);
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSendSingleEmail = async (studentId) => {
    setSendingEmailMap(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/admin/send-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: wallet, student_ids: [studentId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      if (data.devMode) {
        info(`Email logged to console for ${studentId}`);
      } else {
        success(`Code sent to ${studentId}`);
      }
      if (data.failed?.length) {
        showError(`${studentId}: ${data.failed[0]?.reason || "failed"}`);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSendingEmailMap(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleSendEmail = async (studentIds) => {
    setSendingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/send-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminWallet: wallet, student_ids: studentIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      if (data.devMode) {
        info(data.message || "Emails logged to console (SMTP not configured)");
      } else {
        success(data.message || `Emails sent to ${data.sent.length} student(s)`);
      }
      if (data.failed?.length) {
        showError(`${data.failed.length} failed: ${data.failed.map(f => `${f.student_id} (${f.reason})`).join(", ")}`);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setSendingEmail(false);
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

      {/* Input tabs */}
      <div className="flex gap-2 border-b border-app pb-3">
        {INPUT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setInputTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-base font-semibold transition-all cursor-pointer ${
              inputTab === t.id
                ? "text-app-accent bg-app-accent-soft shadow-sm"
                : "text-app-muted-text hover:text-app-heading hover:bg-app-muted/30"
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Manual Entry tab */}
      {inputTab === "manual" && (
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
                <span className="text-xs font-mono text-app-muted-text font-normal">(ID, Name, Year, Gender, Email — one per line)</span>
              </label>
              <textarea
                ref={textareaRef}
                value={studentIdsText}
                onChange={(e) => setStudentIdsText(e.target.value)}
                rows={4}
                placeholder="GU001,John Doe,1st,male,john@example.com"
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
                <>
                  <button
                    onClick={() => downloadCSV(generatedCodes)}
                    className="rounded-xl border border-app bg-app-input px-5 py-2.5 text-sm font-bold text-app-heading hover:bg-app-elevated transition-all cursor-pointer"
                  >
                    📥 Download CSV ({generatedCount})
                  </button>
                  <button
                    onClick={() => handleSendEmail(generatedCodes.map(c => c.student_id))}
                    disabled={sendingEmail}
                    className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-2.5 text-sm font-bold text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingEmail ? "Sending…" : "📧 Send via Email"}
                  </button>
                </>
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
                {merkleRoot && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/70 mb-1">Merkle Root (On-Chain)</p>
                    <p className="text-xs font-mono text-emerald-300 break-all">{merkleRoot}</p>
                    <p className="text-xs text-app-muted-text mt-1">
                      Students can verify their code against the blockchain using this root.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spreadsheet tab */}
      {inputTab === "spreadsheet" && <StudentSpreadsheet />}

      {/* Upload File tab */}
      {inputTab === "upload" && (
        <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
          <div className="px-6 py-5 border-b border-app bg-app-muted/20">
            <h3 className="text-base font-bold text-app-heading">Upload Student File</h3>
            <p className="text-sm text-app-muted-text mt-1">
              Upload an Excel (.xlsx, .xls) or CSV file exported from the registrar. The system detects columns automatically.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all ${
                dragOver
                  ? "border-app-accent bg-app-accent-soft/20"
                  : file
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-app bg-app-muted/20 hover:border-app-muted-text"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              {file ? (
                <>
                  <span className="text-3xl mb-3">📄</span>
                  <p className="text-base font-semibold text-app-heading">{file.name}</p>
                  <p className="text-sm text-app-muted-text mt-1">
                    {(file.size / 1024).toFixed(1)} KB · {previewStudents.length} student(s) detected
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewStudents([]); setPreviewError(""); fileInputRef.current.value = ""; }}
                    className="mt-3 text-sm text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <span className="text-3xl mb-3">📂</span>
                  <p className="text-base font-semibold text-app-heading">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-app-muted-text mt-1">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </>
              )}
            </div>

            {previewError && (
              <p className="text-sm font-medium text-rose-400">{previewError}</p>
            )}

            {/* Preview table */}
            {previewStudents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-app-heading mb-2">
                  Preview ({previewStudents.length} student(s) parsed)
                </h4>
                <div className="rounded-xl border border-app overflow-hidden">
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full min-w-[400px] text-sm">
                      <thead className="bg-app-elevated border-b border-app sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-app-muted-text">Student ID</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-app-muted-text">Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-app-muted-text">Year</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-app-muted-text">Gender</th>
                          <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-app-muted-text">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app/40">
                        {previewStudents.slice(0, 10).map((s, i) => (
                          <tr key={i} className="hover:bg-app-accent-soft transition-colors">
                            <td className="px-4 py-2.5 font-mono text-app-heading">{s.student_id}</td>
                            <td className="px-4 py-2.5 text-app-body">{s.name || "—"}</td>
                            <td className="px-4 py-2.5 text-app-body">{s.year || "—"}</td>
                            <td className="px-4 py-2.5 text-app-body">{s.gender || "—"}</td>
                            <td className="px-4 py-2.5 text-sm text-app-muted-text">{s.email || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {previewStudents.length > 10 && (
                    <p className="px-4 py-2 text-xs text-app-muted-text border-t border-app bg-app-muted/10">
                      Showing 10 of {previewStudents.length} student(s). Upload to process all.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Upload button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || previewStudents.length === 0 || uploading || !wallet}
                className="btn-primary disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                    Uploading & Generating…
                  </>
                ) : (
                  <>Upload & Generate Codes</>
                )}
              </button>

              {generatedCodes.length > 0 && (
                <>
                  <button
                    onClick={() => downloadCSV(generatedCodes)}
                    className="rounded-xl border border-app bg-app-input px-5 py-2.5 text-sm font-bold text-app-heading hover:bg-app-elevated transition-all cursor-pointer"
                  >
                    📥 Download CSV ({generatedCount})
                  </button>
                  <button
                    onClick={() => handleSendEmail(generatedCodes.map(c => c.student_id))}
                    disabled={sendingEmail}
                    className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-5 py-2.5 text-sm font-bold text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingEmail ? "Sending…" : "📧 Send via Email"}
                  </button>
                </>
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
                {merkleRoot && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/70 mb-1">Merkle Root (On-Chain)</p>
                    <p className="text-xs font-mono text-emerald-300 break-all">{merkleRoot}</p>
                    <p className="text-xs text-app-muted-text mt-1">
                      Students can verify their code against the blockchain using this root.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Codes" value={codes.length} />
        <StatCard label="Unused" value={codes.filter((c) => !c.used).length} accent="emerald" />
        <StatCard label="Used" value={codes.filter((c) => c.used).length} accent="muted" />
      </div>

      {/* Auto-reminder controls */}
      <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-app-heading">⏰ Auto Reminder Emails</h3>
            <p className="text-xs text-app-muted-text mt-0.5">
              {pendingStats.total} pending code(s) · {pendingStats.with_email} with email
              {reminderConfig?.lastRun && ` · Last run: ${new Date(reminderConfig.lastRun).toLocaleString()}`}
              {reminderConfig?.lastSentCount > 0 && ` · Sent: ${reminderConfig.lastSentCount}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendReminderNow}
              disabled={sendingReminder || pendingStats.with_email === 0 || !wallet}
              className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {sendingReminder ? "Sending…" : "Send Reminders Now"}
            </button>
            <button
              onClick={handleToggleReminder}
              disabled={togglingReminder || !wallet}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 cursor-pointer ${
                reminderConfig?.enabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-app bg-app-input text-app-muted-text hover:text-app-heading"
              }`}
            >
              {togglingReminder
                ? "…"
                : reminderConfig?.enabled
                  ? "Auto On (Daily 9AM)"
                  : "Enable Auto Reminder"}
            </button>
          </div>
        </div>
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
        <button
          onClick={handleRebuildRoot}
          disabled={rebuildingRoot}
          className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          {rebuildingRoot ? "Rebuilding…" : "Rebuild Merkle Root"}
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
            {
              key: "email",
              label: "Email",
              cellClassName: "text-sm text-app-muted-text max-w-[180px] truncate",
              render: (c) => c.email || "—",
            },
            {
              key: "actions",
              label: "",
              render: (c) =>
                !c.used && c.email ? (
                  <button
                    onClick={() => handleSendSingleEmail(c.student_id)}
                    disabled={sendingEmailMap[c.student_id]}
                    className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {sendingEmailMap[c.student_id] ? "…" : "📧 Send"}
                  </button>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  );
}
