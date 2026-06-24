import { useState, useEffect, useContext, createContext, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL } from "../config";
import { useBalance } from "../hooks/useBalance";
import BlockExplorerLink from "./ui/BlockExplorerLink";
import CandidateSelfRegister from "./CandidateSelfRegister";
import { useToast } from "./ui/Toast";

function getImageUrl(imageCid) {
  if (!imageCid) return null;
  if (imageCid.startsWith("local:")) return `${API_URL}/uploads/${imageCid.slice(6)}`;
  if (imageCid.startsWith("http")) return imageCid;
  return `https://ipfs.io/ipfs/${imageCid}`;
}

const WALLET_MESSAGE = "Gandaki University Election Wallet Verification";
const PortalContext = createContext(null);

function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error();
  return ctx;
}

function PortalAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("portal_token") || null);
  const [student, setStudent] = useState(() => {
    const raw = localStorage.getItem("portal_student");
    return raw ? JSON.parse(raw) : null;
  });

  const save = (t, s) => {
    if (t) localStorage.setItem("portal_token", t);
    localStorage.setItem("portal_student", JSON.stringify(s));
    setToken(t);
    setStudent(s);
  };

  const logout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_student");
    setToken(null);
    setStudent(null);
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) logout();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          localStorage.setItem("portal_student", JSON.stringify(data));
          setStudent(data);
        }
      })
      .catch(() => {});
  }, []);

  const authFetch = async (path, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(opts.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  };

  return (
    <PortalContext.Provider value={{ token, student, save, logout, authFetch }}>
      {children}
    </PortalContext.Provider>
  );
}

function LoginView({ onRegister }) {
  const { save } = usePortal();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: id.trim(), password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      save(data.token, data.student);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg font-semibold text-app-heading">Sign in</h2>

      <div>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="input-field"
          placeholder="Student ID"
          required
        />
      </div>

      <div>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="input-field"
          placeholder="Password"
          required
        />
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm text-center text-app-muted-text">
        New here?{" "}
        <button type="button" onClick={onRegister} className="text-app-accent hover:underline cursor-pointer">
          Register
        </button>
      </p>
    </form>
  );
}

function formatCode(v) {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < raw.length; i += 4) parts.push(raw.slice(i, i + 4));
  return parts.join("-");
}

function RegisterView({ onLogin }) {
  const { save } = usePortal();
  const { connectWallet, wallet } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    setError("");
    const sid = id.trim().toUpperCase();
    const raw = code.replace(/-/g, "").trim().toUpperCase();
    if (!sid) return setError("Enter your student ID");
    if (raw.length !== 12) return setError("Invalid code");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sid, code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.error || "Invalid code");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitDetails = () => {
    setError("");
    if (!name.trim()) return setError("Enter your name");
    if (pw.length < 6) return setError("Password must be 6+ characters");
    if (pw !== confirm) return setError("Passwords don't match");
    setStep(3);
  };

  const signAndRegister = async () => {
    setLoading(true);
    setError("");
    try {
      let addr = wallet;
      if (!addr && connectWallet) addr = await connectWallet();
      if (!addr) throw new Error("Connect MetaMask");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(WALLET_MESSAGE);

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: id.trim().toUpperCase(),
          code: code.trim().toUpperCase(),
          password: pw,
          wallet: addr,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      save(data.token, data.student);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step < 4 && <h2 className="text-base font-semibold text-app-heading">Register</h2>}

      {step < 4 && (
        <div className="flex gap-2">
          {["Code", "Details", "Wallet"].map((l, i) => (
            <span
              key={l}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                step > i + 1
                  ? "border-emerald-500/30 text-emerald-400"
                  : step === i + 1
                  ? "border-sky-400 text-app-accent"
                  : "border-app-border text-app-muted-text"
              }`}
            >
              {l}
            </span>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <input className="input-field text-sm" placeholder="Student ID" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} />
          <input className="input-field text-sm font-mono" placeholder="XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(formatCode(e.target.value))} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button onClick={verify} disabled={loading} className="btn-primary w-full text-sm">{loading ? "Verifying..." : "Verify"}</button>
          <p className="text-xs text-center text-app-muted-text">
            Have an account?{" "}
            <button type="button" onClick={onLogin} className="text-app-accent hover:underline cursor-pointer">Sign in</button>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <input className="input-field text-sm" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-field text-sm" type="password" placeholder="Password (6+ chars)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <input className="input-field text-sm" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1 text-sm">Back</button>
            <button onClick={submitDetails} className="btn-primary flex-1 text-sm">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {!wallet ? (
            <button onClick={connectWallet} className="btn-primary w-full text-sm">Connect MetaMask</button>
          ) : (
            <div className="p-3 rounded-lg border border-app bg-app-muted text-center">
              <p className="text-xs font-mono text-app-accent break-all">{wallet}</p>
            </div>
          )}
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1 text-sm">Back</button>
            <button onClick={signAndRegister} disabled={loading || !wallet} className="btn-primary flex-1 text-sm">
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="py-6 text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-sm">✓</span>
          </div>
          <p className="text-sm font-medium text-emerald-400">Registered</p>
          <button onClick={() => setStep(1)} className="btn-primary text-sm px-5">Dashboard</button>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ student, onPhotoChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { authFetch } = usePortal();
  const { checkVoterStatus } = useContext(AuthContext);
  const imageUrl = getImageUrl(student.image_cid);
  const initials = (student.name || "?").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const data = await authFetch("/api/auth/me/photo", {
        method: "POST",
        body: form,
      });
      if (data.student) onPhotoChange(data.student);
      if (student.wallet_address) checkVoterStatus(student.wallet_address);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative group">
        <div className="h-14 w-14 rounded-xl overflow-hidden border border-app bg-app-elevated">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-black text-slate-950">
              {initials}
            </div>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-app-surface-solid flex items-center justify-center text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? "…" : "+"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-app-heading truncate">{student.name}</p>
          {student.walletVerified && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Verified</span>
          )}
        </div>
        <p className="text-xs text-app-muted-text font-mono">{student.student_id}</p>
      </div>
    </div>
  );
}

function CandidateSection({ student, authFetch }) {
  const { success } = useToast();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedPos, setSelectedPos] = useState("");
  const [error, setError] = useState("");

  const loadApplication = useCallback(async () => {
    if (!student?.student_id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/candidates?applied_by=${student.student_id}`);
      const data = await res.json();
      setApplication(Array.isArray(data) ? data[0] : null);
    } catch (err) {
      console.error("Failed to load application:", err);
    } finally {
      setLoading(false);
    }
  }, [student?.student_id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleApply = async () => {
    if (!selectedPos) return setError("Select a position");
    setApplying(true);
    setError("");
    try {
      await authFetch("/api/candidates/apply", {
        method: "POST",
        body: JSON.stringify({ position: selectedPos }),
      });
      setSelectedPos("");
      await loadApplication();
      success("Application submitted. Pending admin approval.");
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const statusBadge = (status) => {
    if (status === "pending")
      return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Pending</span>;
    if (status === "approved")
      return <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Approved</span>;
    if (status === "rejected")
      return <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Rejected</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-4 animate-pulse">
        <p className="text-xs text-app-muted-text">Loading application status…</p>
      </div>
    );
  }

  if (application) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-heading">Candidate Application</h4>
          {statusBadge(application.status)}
        </div>
        <p className="text-sm text-app-body">
          Position: <span className="font-semibold text-app-heading">{application.position}</span>
        </p>
        {application.status === "approved" && student.eligibleToVote && (
          <CandidateSelfRegister student={student} />
        )}
        {application.status === "approved" && !student.eligibleToVote && (
          <p className="text-xs text-amber-400">You must be whitelisted before you can register on-chain.</p>
        )}
        {application.status === "rejected" && (
          <p className="text-xs text-app-muted-text">Contact the election committee for more information.</p>
        )}
      </div>
    );
  }

  if (!student.eligibleToVote) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted-text">Candidate Application</h4>
        <p className="mt-1 text-xs text-app-muted-text">You must be whitelisted before applying.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app bg-app-surface p-4 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-app-heading">Apply as Candidate</h4>
      <div className="grid grid-cols-3 gap-2">
        {["President", "Secretary", "General Member"].map((pos) => (
          <button
            key={pos}
            onClick={() => setSelectedPos(pos)}
            className={`rounded-lg border px-2 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedPos === pos
                ? "border-app-accent bg-app-accent-soft text-app-accent"
                : "border-app bg-app-input text-app-muted-text hover:text-app-heading"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button
        onClick={handleApply}
        disabled={applying || !selectedPos}
        className="btn-primary w-full text-xs"
      >
        {applying ? "Submitting…" : "Submit Application"}
      </button>
    </div>
  );
}

function Dashboard() {
  const { student, logout, save, authFetch } = usePortal();
  const { balance, loading: balanceLoading } = useBalance(student?.wallet_address);
  if (!student) return null;

  const steps = [
    { label: "Account", done: true },
    { label: "Wallet", done: Boolean(student.wallet_address) },
    { label: "Verified", done: Boolean(student.walletVerified) },
    { label: "Whitelisted", done: Boolean(student.eligibleToVote) },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-app bg-app-surface p-4 space-y-3">
        <ProfileCard student={student} onPhotoChange={(s) => save(null, { ...student, image_cid: s.image_cid })} />
        <button onClick={logout} className="text-xs text-app-muted-text hover:text-app-heading cursor-pointer">Sign out</button>
      </div>

      <CandidateSection student={student} authFetch={authFetch} />

      <div className="grid grid-cols-2 gap-3">
        {student.year && (
          <div className="rounded-lg border border-app bg-app-elevated/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text">Year</p>
            <p className="text-sm font-semibold text-app-heading mt-0.5">{student.year}</p>
          </div>
        )}
        {student.gender && (
          <div className="rounded-lg border border-app bg-app-elevated/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text">Gender</p>
            <p className="text-sm font-semibold text-app-heading mt-0.5 capitalize">{student.gender}</p>
          </div>
        )}
        {student.wallet_address && (
          <div className="col-span-2 rounded-lg border border-app bg-app-elevated/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text">Wallet</p>
            <div className="flex items-center justify-between mt-0.5">
              <BlockExplorerLink hash={student.wallet_address} type="address" />
              {balanceLoading ? (
                <span className="text-xs text-app-muted-text animate-pulse">...</span>
              ) : balance != null ? (
                <span className="text-sm font-mono font-bold text-emerald-400">{Number(balance).toFixed(4)} ETH</span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1">
        {steps.map((s) => (
          <div key={s.label} className={`flex-1 h-1.5 rounded-full ${s.done ? "bg-emerald-400" : "bg-app-border/50"}`} />
        ))}
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs ${
            s.done
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-app-border bg-app-muted/50"
          }`}>
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              s.done ? "bg-emerald-500/20 text-emerald-400" : "bg-app-border/30 text-app-muted-text"
            }`}>
              {s.done ? "✓" : i + 1}
            </span>
            <span className={s.done ? "text-emerald-400 font-medium" : "text-app-muted-text"}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalInner({ onClose }) {
  const { student } = usePortal();
  const [view, setView] = useState("login");

  useEffect(() => {
    if (student) setView("dashboard");
    else setView("login");
  }, [student]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-app-surface-solid w-full sm:max-w-sm rounded-t-xl sm:rounded-xl border border-app shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 h-12 border-b border-app">
          <span className="text-xs font-semibold text-app-heading">Portal</span>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center text-app-muted-text hover:text-app-heading cursor-pointer text-xs">
            ✕
          </button>
        </div>
        <div className="p-4">
          {view === "dashboard" && <Dashboard />}
          {view === "login" && <LoginView onRegister={() => setView("register")} />}
          {view === "register" && <RegisterView onLogin={() => setView("login")} />}
        </div>
      </div>
    </div>
  );
}

export default function StudentPortal({ open, onClose }) {
  if (!open) return null;
  return (
    <PortalAuthProvider>
      <PortalInner onClose={onClose} />
    </PortalAuthProvider>
  );
}
