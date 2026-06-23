import { useState, useEffect, useContext } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL } from "../config";
import { useToast } from "./ui/Toast";

const POSITIONS = [
  { value: 0, label: "President", icon: "👤" },
  { value: 1, label: "Secretary", icon: "📝" },
  { value: 2, label: "General Member", icon: "🤝" },
];

export default function CandidateSelfRegister() {
  const { wallet, student } = useContext(AuthContext);
  const { success, error: showError } = useToast();

  const [phase, setPhase] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [proof, setProof] = useState(null);
  const [guid, setGuid] = useState("");
  const [position, setPosition] = useState(0);
  const [imageCID, setImageCID] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(false);
  const [loadingProof, setLoadingProof] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const loadPhase = async () => {
    setLoadingPhase(true);
    try {
      const contract = await getContractV3();
      const p = await contract.getPhase();
      setPhase(Number(p));

      if (wallet) {
        const reg = await contract.candidateRegisteredInElection(wallet);
        const electionId = await contract.currentElectionId();
        setIsRegistered(Number(reg) === Number(electionId));
      }
    } catch (err) {
      console.error("loadPhase error:", err);
    } finally {
      setLoadingPhase(false);
    }
  };

  const loadIdentityProof = async () => {
    if (!wallet) return;
    setLoadingProof(true);
    try {
      const res = await fetch(`${API_URL}/api/voters/identity-proof?wallet=${wallet}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get identity proof");
      setProof(data.proof);
      setIdentity(data.identity);
    } catch (err) {
      console.error("loadIdentityProof error:", err);
      showError(err.message || "Could not fetch identity proof");
    } finally {
      setLoadingProof(false);
    }
  };

  useEffect(() => {
    loadPhase();
  }, [wallet]);

  useEffect(() => {
    if (phase === 1 && wallet) {
      loadIdentityProof();
    }
  }, [phase, wallet]);

  const handleRegister = async () => {
    if (!wallet) return showError("Connect your wallet first");
    if (!guid.trim()) return showError("Enter your GUID / Student ID");
    if (!proof || proof.length === 0) return showError("Identity proof not available");
    if (!identity) return showError("Identity data not loaded");

    setRegistering(true);
    try {
      const contract = await getContractV3();
      const tx = await contract.registerCandidate(
        guid.trim(),
        identity.name,
        identity.year,
        identity.isFemale,
        imageCID.trim() || "",
        position,
        proof
      );
      await tx.wait();
      success("🎉 Successfully registered as candidate on-chain!");
      setIsRegistered(true);
    } catch (err) {
      console.error(err);
      showError(err.reason || err.shortMessage || err.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  if (loadingPhase) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b] animate-pulse">
        <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">⏳ Checking election phase…</h3>
      </div>
    );
  }

  if (phase !== 1) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-base font-bold text-amber-400 uppercase tracking-wide">📋 Candidate Self-Registration</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Registration is currently closed. The admin must open the Registration phase before candidates can self-register on-chain.
        </p>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
        <h3 className="text-base font-bold text-emerald-400 uppercase tracking-wide">✅ Already Registered</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          You have already registered as a candidate for this election.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#1e3a2b]">
      <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📝 Candidate Self-Registration</h3>
      <p className="mt-1 text-sm text-slate-400 leading-relaxed">
        Register yourself on-chain as a candidate. Your identity (name, year, gender) is verified via the Merkle tree.
      </p>

      {identity && (
        <div className="mt-4 rounded-xl border border-[#1e3a2b]/80 bg-[#0a140f] p-4 space-y-2">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2">Verified Identity (from Merkle tree)</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase">Name</p>
              <p className="font-bold text-emerald-400 truncate">{identity.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Year</p>
              <p className="font-bold text-emerald-400">{identity.year}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Gender</p>
              <p className="font-bold text-emerald-400 capitalize">{identity.isFemale ? "Female" : "Male"}</p>
            </div>
          </div>
        </div>
      )}

      {!identity && !loadingProof && (
        <div className="mt-4 rounded-xl bg-rose-950/20 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-400 leading-relaxed">
          ⚠️ Could not load your verified identity. Make sure your wallet is linked and you are in the voter whitelist.
        </div>
      )}

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">GUID / Student ID</span>
          <input
            type="text"
            value={guid}
            onChange={(e) => setGuid(e.target.value.toUpperCase())}
            className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 font-mono text-sm transition-all"
            placeholder="e.g. GU001"
          />
        </label>

        <label className="block">
          <span className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">Image CID (optional)</span>
          <input
            type="text"
            value={imageCID}
            onChange={(e) => setImageCID(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#1e3a2b] bg-[#0d1510] text-slate-100 px-3.5 py-2.5 focus:border-emerald-500 focus:outline-none placeholder-slate-700 text-sm transition-all"
            placeholder="ipfs://... or https://..."
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">Position</span>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {POSITIONS.map((pos) => (
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

        <button
          onClick={handleRegister}
          disabled={registering || loadingProof || !identity}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-emerald-400 hover:shadow-neon-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {registering ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
              Registering on-chain…
            </span>
          ) : (
            "Register as Candidate"
          )}
        </button>
      </div>
    </div>
  );
}