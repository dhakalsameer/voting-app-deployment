import { useState, useEffect, useContext, createContext } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL } from "../config";



const WALLET_MESSAGE = "Gandaki University Election Wallet Verification";

const YEARS = ["1st", "2nd", "3rd", "4th"];
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other / Prefer not to say" },
];

const PortalContext = createContext(null);

function PortalAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("portal_token") || null);
  const [student, setStudent] = useState(() => {
    const raw = localStorage.getItem("portal_student");
    return raw ? JSON.parse(raw) : null;
  });

  const saveSession = (newToken, newStudent) => {
    if (newToken) localStorage.setItem("portal_token", newToken);
    localStorage.setItem("portal_student", JSON.stringify(newStudent));
    setToken(newToken);
    setStudent(newStudent);
  };

  const logout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_student");
    setToken(null);
    setStudent(null);
  };

  const authedFetch = async (path, opts = {}) => {
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
    <PortalContext.Provider value={{ token, student, saveSession, logout, authedFetch }}>
      {children}
    </PortalContext.Provider>
  );
}

function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside PortalAuthProvider");
  return ctx;
}

function LoginView({ onSwitchToRegister }) {
  const { saveSession } = usePortal();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      saveSession(data.token, data.student);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Student Login</h2>
      <p className="text-sm text-slate-400 leading-relaxed">Sign in with your student ID and portal password.</p>

      <label className="block">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Student ID</span>
        <input
          type="text"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:shadow-neon-glow focus:outline-none placeholder-slate-700 font-mono text-base transition-all"
          placeholder="e.g. 21001"
        />
      </label>

      <label className="block">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:shadow-neon-glow focus:outline-none placeholder-slate-700 text-base transition-all"
          placeholder="••••••••"
        />
      </label>

      {error && <p className="text-xs text-rose-400 font-mono font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-sm text-slate-400">
        New student?{" "}
        <button type="button" onClick={onSwitchToRegister} className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer">
          Create an account
        </button>
      </p>
      <p className="text-center text-xs text-slate-500">
        Need a registration code? Contact the IT Club admin.
      </p>
    </form>
  );
}

/* ── helpers ───────────────────────────────────────────── */
function formatCode(val) {
  const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < raw.length; i += 4) parts.push(raw.slice(i, i + 4));
  return parts.join("-");
}

function RegisterView({ onSwitchToLogin }) {
  const { saveSession } = usePortal();
  const { connectWallet, wallet } = useContext(AuthContext);
  const [step, setStep] = useState(1);

  const [studentId, setStudentId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep(1);
    setStudentId("");
    setCode("");
    setPassword("");
    setConfirm("");
    setName("");
    setError("");
  };

  /* Step 1 ─ verify code */
  const verifyCode = async () => {
    setError("");
    const sid = studentId.trim().toUpperCase();
    const rawCode = code.replace(/-/g, "").trim().toUpperCase();
    if (!sid) return setError("Enter your student ID.");
    if (rawCode.length !== 12) return setError("Enter a valid 12-character registration code.");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: sid, code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.error || "Invalid or already used registration code.");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 ─ password */
  const confirmDetails = () => {
    setError("");
    if (!name.trim()) return setError("Enter your full name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setStep(3);
  };

  /* Step 3 ─ MetaMask + sign + register */
  const signAndRegister = async () => {
    setError("");
    setLoading(true);
    try {
      let address = wallet;
      if (!address && connectWallet) {
        address = await connectWallet();
      }
      if (!address) throw new Error("Please connect MetaMask first.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(WALLET_MESSAGE);

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId.trim().toUpperCase(),
          code: code.trim().toUpperCase(),
          password,
          wallet: address,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      saveSession(data.token, data.student);
      setStep(4);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {step < 4 && (
        <div>
          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wider">Student Registration</h2>
          <p className="text-sm text-slate-400 mt-1">Register with your admin-provided registration code.</p>
        </div>
      )}

      {/* Progress pills */}
      {step < 4 && (
        <div className="flex gap-2 py-2">
          {[
            { n: 1, label: "Code" },
            { n: 2, label: "Details" },
            { n: 3, label: "Wallet" },
          ].map((s) => (
            <div
              key={s.n}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider border ${
                step === s.n ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-neon-glow" : step > s.n ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400/70" : "bg-[#0d1510] border-[#1e3a2b] text-slate-500"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${
                step >= s.n ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-600"
              }`}>
                {step > s.n ? "✓" : s.n}
              </span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: Verify Code ── */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Student ID</span>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 font-mono text-base transition-all"
              placeholder="e.g. GU001"
            />
          </label>

          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Registration Code</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 font-mono tracking-widest focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-base transition-all"
              placeholder="XXXX-XXXX-XXXX"
            />
          </label>

          {error && <p className="text-sm text-rose-400 font-mono font-medium">{error}</p>}

          <button
            onClick={verifyCode}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Verifying Code…" : "Verify Code"}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already registered?{" "}
            <button type="button" onClick={onSwitchToLogin} className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer">
              Sign in
            </button>
          </p>
        </div>
      )}

      {/* ── Step 2: Details ── */}
      {step === 2 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-base transition-all"
              placeholder="Your full name"
            />
          </label>

          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-base transition-all"
              placeholder="At least 6 characters"
            />
          </label>

          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Confirm Password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-base transition-all"
              placeholder="Re-enter password"
            />
          </label>

          {error && <p className="text-sm text-rose-400 font-mono font-medium">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-[#1e3a2b] py-3 text-sm font-black uppercase tracking-wider text-slate-300 hover:bg-[#0f1c15] transition-all active:scale-98 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={confirmDetails}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition-all active:scale-98 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Wallet + Sign ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed bg-[#0a140f] p-3.5 border border-[#1e3a2b] rounded-xl">
            🔒 Connect your MetaMask wallet and sign a security signature to link this browser session to your cryptographic ID.
          </p>

          {!wallet ? (
            <button
              onClick={connectWallet}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow transition-all cursor-pointer"
            >
              Connect MetaMask Wallet
            </button>
          ) : (
            <div className="rounded-xl bg-[#0a140f] border border-[#1e3a2b] p-4 text-center">
              <p className="text-sm font-mono text-emerald-400 break-all">{wallet}</p>
              <p className="text-xs font-mono text-slate-500 mt-1 uppercase">Secure Wallet Connected</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-400 font-mono font-medium">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-[#1e3a2b] py-3 text-sm font-black uppercase tracking-wider text-slate-300 hover:bg-[#0f1c15] transition-all active:scale-98 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={signAndRegister}
              disabled={loading || !wallet}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-98 cursor-pointer"
            >
              {loading ? "Registering…" : "Sign & Register"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Success ── */}
      {step === 4 && (
        <div className="space-y-5 text-center py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 text-2xl font-black shadow-neon-glow animate-float">
            ✓
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-tight">Registration Complete!</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed px-4">
              Your cryptographic profile has been successfully sealed. The verification code has been permanently archived.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow transition-all cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ student, size = 96 }) {
  const url = student.image_cid
    ? student.image_cid.startsWith("http")
      ? student.image_cid
      : student.image_cid.startsWith("local:")
      ? `${API_URL}/uploads/${student.image_cid.slice("local:".length)}`
      : `https://ipfs.io/ipfs/${student.image_cid}`
    : null;
  const initials = (student.name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={student.name}
        style={{ width: size, height: size }}
        className="rounded-2xl border-2 border-emerald-500/20 object-cover shadow-neon-glow"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-black text-slate-950 shadow-neon-glow"
    >
      {initials}
    </div>
  );
}

function PhotoUploadCard() {
  const { student, authedFetch, saveSession } = usePortal();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
    setMsg("");
    setErr("");
  };

  const upload = async () => {
    if (!file) return setErr("Pick a photo first");
    setUploading(true);
    setMsg("");
    setErr("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const data = await authedFetch("/api/auth/me/photo", {
        method: "POST",
        body: form,
      });
      saveSession(localStorage.getItem("portal_token"), {
        ...student,
        image_cid: data.image_cid,
      });
      setMsg("Photo uploaded and pinned to IPFS");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b]">
      <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📸 Profile Photo</h3>
      <p className="mt-1 text-sm text-slate-400 leading-relaxed">
        Uploaded photos are pinned to IPFS; only the cryptographic CID is stored on the server cache.
      </p>

      <div className="mt-5 flex items-center gap-4">
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{ width: 80, height: 80 }}
            className="rounded-2xl border border-emerald-500/30 object-cover shadow-neon-glow"
          />
        ) : (
          <Avatar student={student} size={80} />
        )}
        <div className="flex-1 min-w-0">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-500/10 file:border-emerald-500/20 file:px-3.5 file:py-2.5 file:text-sm file:font-bold file:text-emerald-400 file:uppercase hover:file:bg-emerald-500/25 transition-all file:cursor-pointer"
          />
        </div>
      </div>

      {msg && <p className="mt-3 text-sm font-mono font-medium text-emerald-400">{msg}</p>}
      {err && <p className="mt-3 text-sm font-mono font-medium text-rose-400">{err}</p>}

      <button
        onClick={upload}
        disabled={uploading || !file}
        className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {uploading ? "Uploading to IPFS Network…" : "Upload Photo"}
      </button>
    </div>
  );
}

function WalletLinkCard() {
  const { student, authedFetch, saveSession } = usePortal();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const linkWallet = async () => {
    setMsg("");
    setErr("");
    if (!window.ethereum) {
      setErr("MetaMask not installed");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      const signature = await signer.signMessage(WALLET_MESSAGE);

      const res = await fetch(`${API_URL}/api/wallet/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          wallet: walletAddress,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wallet link failed");

      setMsg(`✅ Wallet linked: ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`);
      const profile = await authedFetch("/api/auth/me");
      saveSession(localStorage.getItem("portal_token"), profile);
    } catch (e) {
      setErr(e.message || "Link failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b]">
      <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">🔗 Wallet Link</h3>
      <p className="mt-1 text-sm text-slate-400 leading-relaxed">
        Connect your Ethereum wallet to verify identity signatures and enable smart contract interactions.
      </p>

      <div className="mt-5 rounded-2xl bg-[#0a140f] border border-[#1e3a2b]/80 p-4 text-center">
        {student.wallet_address ? (
          <p className="break-all font-mono text-sm text-emerald-400">{student.wallet_address}</p>
        ) : (
          <p className="text-sm italic text-slate-500">No blockchain wallet linked yet.</p>
        )}
      </div>

      {msg && <p className="mt-3 text-sm font-mono font-medium text-emerald-400">{msg}</p>}
      {err && <p className="mt-3 text-sm font-mono font-medium text-rose-400">{err}</p>}

      <button
        onClick={linkWallet}
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {loading ? "Signing Payload…" : student.wallet_address ? "Re-link Wallet Address" : "Link MetaMask Wallet"}
      </button>
    </div>
  );
}

function CandidateApplicationCard() {
  const { student, authedFetch } = usePortal();
  const [status, setStatus] = useState("loading"); // loading, none, pending, approved, rejected
  const [applying, setApplying] = useState(false);
  const [position, setPosition] = useState(0);
  const [manifesto, setManifesto] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const positions = [
    { value: 0, label: "President", icon: "👤" },
    { value: 1, label: "Secretary", icon: "📝" },
    { value: 2, label: "General Member", icon: "🤝" },
  ];

  const checkStatus = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/candidates?applied_by=${student.student_id}`
      );
      const data = await res.json();
      const mine = data.find((c) => c.applied_by === student.student_id);
      if (mine) setStatus(mine.status);
      else setStatus("none");
    } catch {
      setStatus("none");
    }
  };

  useEffect(() => {
    if (student?.student_id) checkStatus();
  }, [student?.student_id]);

  const submit = async () => {
    setErr("");
    setMsg("");
    setApplying(true);
    try {
      const posLabel = positions[position].label;
      await authedFetch("/api/candidates/apply", {
        method: "POST",
        body: JSON.stringify({
          position: posLabel,
          manifesto: manifesto.trim(),
          // name, year, gender are pulled from the DB student record by the backend
        }),
      });
      setMsg("✅ Application submitted! Pending election committee review.");
      setStatus("pending");
    } catch (e) {
      setErr(e.message || "Application failed");
    } finally {
      setApplying(false);
    }
  };

  const isEligible = Boolean(student.eligible_to_vote);

  if (status === "loading") {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b] animate-pulse">
        <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📤 Candidate Application</h3>
        <p className="mt-2 text-sm text-slate-500">Checking your application status…</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-base font-bold text-amber-400 uppercase tracking-wide">⏳ Application Submitted</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Your candidate application is under review by the election committee. You will be notified once the admin approves or rejects your application.
        </p>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
        <h3 className="text-base font-bold text-emerald-400 uppercase tracking-wide">🎉 Application Approved</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Congratulations! Your candidate application has been approved. You are now officially on the ballot.
        </p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5">
        <h3 className="text-base font-bold text-rose-400 uppercase tracking-wide">❌ Application Rejected</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Your candidate application was not approved by the election committee.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b]">
      <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📤 Candidate Application</h3>
      <p className="mt-1 text-sm text-slate-400 leading-relaxed">
        Apply to run for an elected position. Only verified voters can apply.
      </p>

      {!isEligible && (
        <p className="mt-4 rounded-xl bg-amber-950/20 border border-amber-500/20 px-4 py-2.5 text-sm text-amber-400 leading-relaxed">
          ⚠️ You must be verified and added to the Merkle whitelist before applying as a candidate. Complete the verification steps above.
        </p>
      )}

      {isEligible && (
        <div className="mt-5 space-y-4">
          {/* Auto-filled profile info from DB — prevents manipulation */}
          <div className="rounded-xl border border-[#1e3a2b]/80 bg-[#0a140f] p-4 space-y-2">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">Your Profile (auto-filled from registry)</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase">Name</p>
                <p className="font-bold text-emerald-400 truncate">{student.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Year</p>
                <p className="font-bold text-emerald-400">{student.year || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Gender</p>
                <p className="font-bold text-emerald-400 capitalize">{student.gender || "—"}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 italic mt-1">
              This information comes from your student record and cannot be changed during the application.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Position</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {positions.map((pos) => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => setPosition(pos.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    position === pos.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-neon-glow"
                      : "border-[#1e3a2b] bg-[#0d1510] text-slate-500 hover:text-slate-300 hover:bg-[#0f1c15]"
                  }`}
                >
                  <span className="text-lg">{pos.icon}</span>
                  <span className="text-center leading-tight">{pos.label}</span>
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              Manifesto / Statement (optional)
            </span>
            <textarea
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-base transition-all resize-none"
              placeholder="Why should the IT Club elect you?"
            />
          </label>

          {err && <p className="text-sm font-mono text-rose-400">{err}</p>}
          {msg && <p className="text-sm font-mono text-emerald-400">{msg}</p>}

          <button
            onClick={submit}
            disabled={applying}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {applying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                Submitting Application…
              </span>
            ) : (
              "Submit Application"
            )}
          </button>

          <p className="text-xs text-slate-600 text-center italic">
            By submitting, you confirm that all auto-filled details match your student record.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusCard() {
  const { student } = usePortal();
  const steps = [
    { label: "Account created", done: true },
    { label: "Wallet linked", done: Boolean(student.wallet_address) },
    { label: "Admin verified wallet signature", done: Boolean(student.walletVerified) },
    { label: "Added to Merkle whitelist", done: Boolean(student.eligibleToVote) },
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b]">
      <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📋 Verification Status</h3>
      <ul className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black border ${
                s.done ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-neon-glow" : "bg-[#0d1510] border-[#1e3a2b] text-slate-500"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${s.done ? "font-bold text-slate-100" : "text-slate-500"}`}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileCard() {
  const { student, authedFetch, saveSession } = usePortal();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(student.name || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const missingFields = !student.year || !student.gender;

  const startEdit = () => {
    setName(student.name || "");
    setErr("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const updated = await authedFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      const token = localStorage.getItem("portal_token");
      saveSession(token, updated);
      setEditing(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">👤 Student Profile</h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="rounded-lg border border-[#1e3a2b] bg-[#0d1510] px-3.5 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-[#0f1c15] transition-all cursor-pointer"
          >
            Edit
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Avatar student={student} size={64} />
        <div>
          <p className="text-base font-bold text-slate-100">{student.name}</p>
          <p className="text-xs font-mono text-slate-500">ID: {student.student_id}</p>
        </div>
      </div>

      {missingFields && !editing && (
        <p className="mt-4 rounded-xl bg-amber-950/20 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-400 leading-relaxed">
          ⚠️ Your profile is incomplete. Click <strong>Edit</strong> to finalize your credentials.
        </p>
      )}

      {!editing ? (
        <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0a140f] p-3 rounded-xl border border-[#1e3a2b]/30">
            <dt className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Year</dt>
            <dd className="font-bold text-slate-200 mt-1">{student.year ? `${student.year} year` : "—"}</dd>
          </div>
          <div className="bg-[#0a140f] p-3 rounded-xl border border-[#1e3a2b]/30">
            <dt className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Gender</dt>
            <dd className="font-bold capitalize text-slate-200 mt-1">{student.gender || "—"}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-base transition-all"
            />
          </label>

          {err && <p className="text-sm font-mono text-rose-400">{err}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 rounded-xl border border-[#1e3a2b] py-2.5 text-sm font-black uppercase tracking-wider text-slate-300 hover:bg-[#0f1c15] disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 disabled:opacity-40 cursor-pointer"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { student, logout } = usePortal();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 p-6 text-white shadow-neon-glow relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl"></div>
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">Secure Student Portal</p>
        <h2 className="mt-1.5 text-2xl font-black uppercase tracking-tight text-white">Welcome, {student.name}</h2>
        <p className="text-sm text-slate-400 font-mono mt-0.5">VOTER ID: {student.student_id}</p>
        
        <button
          onClick={logout}
          className="mt-4 rounded-xl border border-[#1e3a2b] bg-[#080f0b] px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          Sign out session
        </button>
      </div>

      <ProfileCard />
      <PhotoUploadCard />
      <StatusCard />
      <WalletLinkCard />
      <CandidateApplicationCard />
      <CandidateSelfRegister />
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-[#080f0b]/80 p-0 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="glass-panel relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-neon-intense sm:my-0 max-h-[92dvh] sm:max-h-[calc(100vh-2rem)] overflow-y-auto border border-[#1e3a2b] safe-bottom">
        <button
          onClick={onClose}
          className="sticky top-0 -mt-2 -mr-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shadow-sm"
          aria-label="Close portal"
        >
          ✕
        </button>

        <div className="mt-4">
          {view === "dashboard" && <Dashboard />}
          {view === "login" && <LoginView onSwitchToRegister={() => setView("register")} />}
          {view === "register" && <RegisterView onSwitchToLogin={() => setView("login")} />}
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
