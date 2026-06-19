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
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-black text-slate-800">Student Login</h2>
      <p className="text-sm text-slate-500">Sign in with your student ID and portal password.</p>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Student ID</span>
        <input
          type="text"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          placeholder="e.g. 21001"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          placeholder="••••••••"
        />
      </label>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-center text-sm text-slate-500">
        New student?{" "}
        <button type="button" onClick={onSwitchToRegister} className="font-bold text-blue-600 hover:underline">
          Create an account
        </button>
      </p>
      <p className="text-center text-xs text-slate-400">
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
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep(1);
    setStudentId("");
    setCode("");
    setName("");
    setPassword("");
    setConfirm("");
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
          name: name.trim(),
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
    <div className="space-y-4">
      {step < 4 && (
        <div>
          <h2 className="text-2xl font-black text-slate-800">Student Registration</h2>
          <p className="text-sm text-slate-500">Register with your admin-provided registration code.</p>
        </div>
      )}

      {/* Progress pills */}
      {step < 4 && (
        <div className="flex gap-2">
          {[
            { n: 1, label: "Code" },
            { n: 2, label: "Details" },
            { n: 3, label: "Wallet" },
          ].map((s) => (
            <div
              key={s.n}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                step === s.n ? "bg-blue-600 text-white" : step > s.n ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current text-[9px]">
                <span className={step > s.n ? "text-emerald-700" : step === s.n ? "text-white" : "text-slate-400"}>✓</span>
              </span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: Verify Code ── */}
      {step === 1 && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Student ID</span>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. GU001"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Registration Code</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-widest focus:border-blue-500 focus:outline-none"
              placeholder="XXXX-XXXX-XXXX"
            />
          </label>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button
            onClick={verifyCode}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loading ? "Verifying…" : "Verify Code"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already registered?{" "}
            <button type="button" onClick={onSwitchToLogin} className="font-bold text-blue-600 hover:underline">
              Sign in
            </button>
          </p>
        </div>
      )}

      {/* ── Step 2: Details ── */}
      {step === 2 && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Your full name"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="At least 6 characters"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Confirm Password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Re-enter password"
            />
          </label>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={confirmDetails}
              className="flex-1 rounded-lg bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Wallet + Sign ── */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Connect your MetaMask wallet and sign a message to prove ownership.
          </p>

          {!wallet ? (
            <button
              onClick={connectWallet}
              className="w-full rounded-lg bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700"
            >
              Connect MetaMask
            </button>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-sm font-mono text-slate-700 break-all">{wallet}</p>
              <p className="text-xs text-slate-500 mt-1">Wallet connected</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={signAndRegister}
              disabled={loading || !wallet}
              className="flex-1 rounded-lg bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
            >
              {loading ? "Registering…" : "Sign & Register"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Success ── */}
      {step === 4 && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl font-black">
            ✓
          </div>
          <h3 className="text-xl font-black text-emerald-800">Registration Complete!</h3>
          <p className="text-sm text-slate-600">
            Your account has been created and your registration code has been marked as used.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white hover:bg-blue-700"
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
        className="rounded-xl border-2 border-white object-cover shadow-sm"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-black text-white shadow-sm"
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-800">📸 Profile Photo</h3>
      <p className="mt-1 text-sm text-slate-500">
        Uploaded photos are pinned to IPFS; only the CID is stored on the server.
      </p>

      <div className="mt-4 flex items-center gap-4">
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{ width: 80, height: 80 }}
            className="rounded-xl border-2 border-slate-200 object-cover"
          />
        ) : (
          <Avatar student={student} size={80} />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onFileChange}
          className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {msg && <p className="mt-3 text-sm font-medium text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}

      <button
        onClick={upload}
        disabled={uploading || !file}
        className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {uploading ? "Uploading to IPFS…" : "Upload Photo"}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-800">🔗 Wallet Link</h3>
      <p className="mt-1 text-sm text-slate-500">
        Connect your Ethereum wallet to verify identity and vote on-chain.
      </p>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        {student.wallet_address ? (
          <p className="break-all text-sm font-mono text-slate-700">{student.wallet_address}</p>
        ) : (
          <p className="text-sm italic text-slate-400">No wallet linked yet.</p>
        )}
      </div>

      {msg && <p className="mt-3 text-sm font-medium text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}

      <button
        onClick={linkWallet}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
      >
        {loading ? "Signing…" : student.wallet_address ? "Re-link Wallet" : "Link MetaMask Wallet"}
      </button>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-800">📋 Verification Status</h3>
      <ul className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                s.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${s.done ? "font-semibold text-slate-800" : "text-slate-500"}`}>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-800">👤 Profile</h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Avatar student={student} size={72} />
        <div>
          <p className="text-base font-black text-slate-800">{student.name}</p>
          <p className="text-xs text-slate-500">ID: {student.student_id}</p>
        </div>
      </div>

      {missingFields && !editing && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Your profile is incomplete. Click <strong>Edit</strong> to add your year and gender.
        </p>
      )}

      {!editing ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Year</dt>
            <dd className="font-semibold text-slate-800">{student.year ? `${student.year} year` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gender</dt>
            <dd className="font-semibold capitalize text-slate-800">{student.gender || "—"}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {err && <p className="text-xs font-medium text-red-600">{err}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
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
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Student Portal</p>
        <h2 className="mt-1 text-2xl font-black">Welcome, {student.name}</h2>
        <p className="text-sm opacity-90">ID: {student.student_id}</p>
        <button
          onClick={logout}
          className="mt-4 rounded-lg bg-white/20 px-4 py-1.5 text-xs font-bold hover:bg-white/30"
        >
          Sign out
        </button>
      </div>

      <ProfileCard />
      <PhotoUploadCard />
      <StatusCard />
      <WalletLinkCard />
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative my-4 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:my-0 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <button
          onClick={onClose}
          className="sticky top-0 -mt-2 -mr-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          aria-label="Close portal"
        >
          ✕
        </button>

        {view === "dashboard" && <Dashboard />}
        {view === "login" && <LoginView onSwitchToRegister={() => setView("register")} />}
        {view === "register" && <RegisterView onSwitchToLogin={() => setView("login")} />}
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
