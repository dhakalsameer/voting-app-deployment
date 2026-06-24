import { useState, useEffect, useContext } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL } from "../config";
import { useToast } from "./ui/Toast";
import BlockExplorerLink from "./ui/BlockExplorerLink";

const POSITIONS = [
  { value: 0, label: "President", icon: "👤" },
  { value: 1, label: "Secretary", icon: "📝" },
  { value: 2, label: "General Member", icon: "🤝" },
];

/*
 * Called when the admin has approved the student's candidate application AND
 * the Registration phase is open on-chain. This component:
 *   1. Loads the current contract phase + checks if already registered
 *   2. Fetches the student's identity Merkle proof from the backend
 *   3. Lets the student pick a position and submit registerCandidate() on-chain
 *   4. On success, shows a confirmation with the transaction link
 */
export default function CandidateSelfRegister({ student }) {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError } = useToast();

  const [phase, setPhase] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [proof, setProof] = useState(null);
  const [guid, setGuid] = useState(student?.student_id || "");
  const [position, setPosition] = useState(0);
  const [imageCID, setImageCID] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(false);
  const [loadingProof, setLoadingProof] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [txHash, setTxHash] = useState(null);

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
      if (!Number.isFinite(identity.year)) throw new Error("Invalid year from identity proof");
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
      setTxHash(tx.hash);
      await tx.wait();
      success("Successfully registered as candidate!", { txHash: tx.hash });
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
      <div className="rounded-xl border border-app bg-app-surface p-5 animate-pulse">
        <p className="text-sm text-app-muted-text">Checking election phase…</p>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-2">
        <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <span className="text-emerald-400 text-sm">✓</span>
        </div>
        <p className="text-sm font-bold text-emerald-400">Already Registered On-Chain</p>
        <p className="text-xs text-app-body">You have already registered as a candidate for this election.</p>
        {txHash && (
          <div className="text-xs font-mono pt-1">
            <BlockExplorerLink hash={txHash} />
          </div>
        )}
      </div>
    );
  }

  if (phase !== 1) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-center space-y-2">
        <span className="text-2xl block">📋</span>
        <p className="text-sm font-bold text-amber-400">Registration Not Open</p>
        <p className="text-xs text-app-body">
          The Registration phase has not started yet. The admin must open it before you can register on-chain.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app bg-app-surface p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-app/50">
        <span className="text-lg">📝</span>
        <div>
          <p className="text-sm font-bold text-app-heading">Register as Candidate</p>
          <p className="text-xs text-app-muted-text">Your identity is verified via Merkle tree proof</p>
        </div>
      </div>

      {identity ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">✓ Identity Verified</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-app-muted-text uppercase">Name</p>
              <p className="text-sm font-semibold text-app-heading truncate">{identity.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-app-muted-text uppercase">Year</p>
              <p className="text-sm font-semibold text-app-heading">{identity.year}</p>
            </div>
            <div>
              <p className="text-[10px] text-app-muted-text uppercase">Gender</p>
              <p className="text-sm font-semibold text-app-heading capitalize">{identity.isFemale ? "Female" : "Male"}</p>
            </div>
          </div>
        </div>
      ) : loadingProof ? (
        <div className="rounded-lg border border-app bg-app-muted/30 p-4 animate-pulse flex items-center gap-2">
          <span className="h-3 w-3 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
          <span className="text-xs text-app-muted-text">Verifying your identity via Merkle tree…</span>
        </div>
      ) : (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-xs text-rose-400">
            Could not load your verified identity. Make sure your wallet is connected and you're whitelisted as a voter.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text">Student ID</label>
          <input
            type="text"
            value={guid}
            onChange={(e) => setGuid(e.target.value.toUpperCase())}
            className="input-field mt-1 text-sm font-mono"
            placeholder="e.g. GUSD430"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text">Image CID</label>
          <input
            type="text"
            value={imageCID}
            onChange={(e) => setImageCID(e.target.value)}
            className="input-field mt-1 text-sm"
            placeholder="ipfs://… or https://…"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted-text mb-1.5">Position</p>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => setPosition(pos.value)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-bold transition-all cursor-pointer ${
                position === pos.value
                  ? "border-app-accent bg-app-accent-soft text-app-accent ring-1 ring-app-accent/30"
                  : "border-app bg-app-input text-app-muted-text hover:text-app-heading hover:bg-app-elevated"
              }`}
            >
              <span className="text-base">{pos.icon}</span>
              <span>{pos.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleRegister}
        disabled={registering || loadingProof || !identity}
        className="btn-primary w-full text-sm"
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
  );
}
