import { useState, useEffect, useContext, createContext, useRef, useCallback } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL, CONTRACT_ADDRESS_V3 } from "../config";
import { useBalance } from "../hooks/useBalance";
import BlockExplorerLink from "./ui/BlockExplorerLink";
import { useToast } from "./ui/Toast";
import Election3ABI from "../abi/Election3.json";

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

/*
 * Student registration: 3-step wizard (Code → Details → Wallet).
 * Step 1 validates the registration code against the backend.
 * Step 2 collects name + password.
 * Step 3 links MetaMask wallet and submits everything to /api/auth/register.
 */
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

  /*
   * Step 3: Connect wallet, sign message, then submit everything to backend.
   * IMPORTANT: 'name' is explicitly included in the request body. Without it,
   * the backend returns 400 if the admin did not pre-fill names via CSV.
   */
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
          name,
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

  const steps = [
    { num: 1, label: "Code", icon: "🔑" },
    { num: 2, label: "Details", icon: "✏️" },
    { num: 3, label: "Wallet", icon: "🦊" },
  ];

  return (
    <div className="space-y-5">
      {step < 4 && (
        <>
          <div className="text-center">
            <h2 className="text-base font-semibold text-app-heading">Create Account</h2>
            <p className="text-xs text-app-muted-text mt-1">Complete all steps to register for the election</p>
          </div>

          <div className="relative">
            <div className="absolute top-4 left-6 right-6 h-px bg-app-border/60" />
            <div className="flex justify-between relative">
              {steps.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step > s.num
                        ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40"
                        : step === s.num
                        ? "bg-app-accent-soft text-app-accent border-2 border-app-accent shadow-sm"
                        : "bg-app-muted/50 text-app-muted-text border-2 border-app-border/50"
                    }`}
                  >
                    {step > s.num ? "✓" : s.icon}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      step >= s.num ? "text-app-heading" : "text-app-muted-text"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <div className="rounded-xl border border-app bg-app-muted/30 p-4 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🔐</span>
            <p className="text-xs font-medium text-app-heading">Enter your registration credentials</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mb-1 block">Student ID</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-app-muted-text font-mono">📋</span>
              <input
                className="input-field text-sm pl-8"
                placeholder="e.g. GUSD430"
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mb-1 block">Registration Code</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-app-muted-text">🔑</span>
              <input
                className="input-field text-sm font-mono pl-8 tracking-[0.15em]"
                placeholder="XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}
          <button onClick={verify} disabled={loading} className="btn-primary w-full text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                Verifying…
              </span>
            ) : (
              "Verify Code"
            )}
          </button>
          <p className="text-xs text-center text-app-muted-text">
            Have an account?{" "}
            <button type="button" onClick={onLogin} className="text-app-accent hover:underline cursor-pointer font-medium">Sign in</button>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-app bg-app-muted/30 p-4 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-base">✏️</span>
            <p className="text-xs font-medium text-app-heading">Set up your profile and password</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mb-1 block">Full Name</label>
            <input
              className="input-field text-sm"
              placeholder="e.g. Ram Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mb-1 block">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-app-muted-text">🔒</span>
              <input
                className="input-field text-sm pl-8"
                type="password"
                placeholder="Min 6 characters"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mb-1 block">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-app-muted-text">🔒</span>
              <input
                className="input-field text-sm pl-8"
                type="password"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1 text-sm">← Back</button>
            <button onClick={submitDetails} className="btn-primary flex-1 text-sm">Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-app bg-app-muted/30 p-4 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🦊</span>
            <p className="text-xs font-medium text-app-heading">Link your wallet to complete registration</p>
          </div>

          {!wallet ? (
            <button
              onClick={connectWallet}
              className="w-full rounded-xl border-2 border-dashed border-app-accent/40 bg-app-accent-soft/10 py-6 flex flex-col items-center gap-2 hover:bg-app-accent-soft/20 hover:border-app-accent/60 transition-all cursor-pointer"
            >
              <span className="text-2xl">🦊</span>
              <span className="text-sm font-bold text-app-accent">Connect MetaMask</span>
              <span className="text-[10px] text-app-muted-text">Your wallet will be linked to your account</span>
            </button>
          ) : (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-2">
              <div className="mx-auto h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-emerald-400 text-xs">✓</span>
              </div>
              <p className="text-xs font-mono text-app-accent break-all">{wallet}</p>
              <p className="text-[10px] text-emerald-400 font-medium">Wallet connected</p>
            </div>
          )}

          {wallet && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <p className="text-[10px] text-amber-400 font-medium">Signature required</p>
              <p className="text-xs text-app-muted-text mt-0.5">
                You will be asked to sign a message to prove wallet ownership.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1 text-sm">← Back</button>
            <button
              onClick={signAndRegister}
              disabled={loading || !wallet}
              className="btn-primary flex-1 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
                  Registering…
                </span>
              ) : (
                "Complete Registration"
              )}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center animate-bounce">
            <span className="text-emerald-400 text-2xl">✓</span>
          </div>
          <div>
            <p className="text-base font-bold text-emerald-400">Registration Complete!</p>
            <p className="text-xs text-app-muted-text mt-1">You can now sign in and access the portal.</p>
          </div>
          <button onClick={() => setStep(1)} className="btn-primary text-sm px-8 mx-auto">
            Go to Dashboard
          </button>
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

/*
 * CandidateSection: shown inside the student Dashboard.
 * Fetches the student's candidate application (if any) and displays:
 *   - No application and not eligible → "wait for whitelist"
 *   - No application and eligible → apply form (President/Secretary/General Member)
 *   - Pending application → "under review"
 *   - Approved + eligible → directs user to the main page registration section
 *   - Rejected → "contact committee"
 */
function CandidateSection({ student }) {
  const [phase, setPhase] = useState(null);
  const [regEnd, setRegEnd] = useState(null);
  const [phaseLoading, setPhaseLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const contract = new ethers.Contract(CONTRACT_ADDRESS_V3, Election3ABI.abi, provider);
        const p = Number(await contract.getPhase());
        const re = Number(await contract.registrationEnd());
        if (mounted) {
          setPhase(p);
          setRegEnd(re);
        }
      } catch (err) {
        console.error("Failed to load phase:", err);
      } finally {
        if (mounted) setPhaseLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (phaseLoading) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-4 animate-pulse space-y-2">
        <div className="h-3 w-24 bg-app-muted rounded" />
        <div className="h-3 w-40 bg-app-muted rounded" />
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isRegistrationOpen = phase === 1 && regEnd > now;

  const studentYear = Number(student.year);
  const eligiblePositions = [];
  if (studentYear === 4) eligiblePositions.push("President");
  if (studentYear >= 3) eligiblePositions.push("Secretary");
  eligiblePositions.push("General Member");

  if (!student.eligibleToVote) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted-text">Candidate Registration</h4>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400">
            You must be whitelisted as a voter before you can register as a candidate.
          </p>
        </div>
      </div>
    );
  }

  if (!isRegistrationOpen) {
    const expired = phase === 1 && regEnd <= now;
    return (
      <div className="rounded-xl border border-app bg-app-surface p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted-text">Candidate Registration</h4>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400">
            {expired ? "The registration window has expired." : "Registration is not open yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app bg-app-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">🎯</span>
        <h4 className="text-xs font-bold uppercase tracking-wider text-app-heading">Register as Candidate</h4>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
        <p className="text-xs text-emerald-400">
          Registration is open. You are eligible to run for:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {eligiblePositions.map((pos) => (
            <span key={pos} className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              {pos}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-app-muted-text pt-1">
          Use the <strong>Candidate Registration</strong> banner on the main page to register directly on-chain. Your wallet will sign the transaction and you pay the gas fee.
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { student, logout, save } = usePortal();
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

      <CandidateSection student={student} />

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
