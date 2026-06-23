import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL, CONTRACT_ADDRESS_V3, SEPOLIA_CHAIN_ID, SEPOLIA_NETWORK, SEPOLIA_EXPLORER } from "../config";
import { getProof } from "../utils/merkle";
import { useBalance } from "../hooks/useBalance";
import { useToast } from "./ui/Toast";

const getImageUrl = (imageCID) => {
  if (!imageCID) return "";
  if (imageCID.startsWith("http://") || imageCID.startsWith("https://")) return imageCID;
  return `https://ipfs.io/ipfs/${imageCID}`;
};

const getPositionLabel = (position) => {
  if (position === 0) return "President";
  if (position === 1) return "Secretary";
  return "General Member";
};

function CandidateSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-app bg-app-elevated/40 p-5 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 shrink-0 rounded-xl bg-sky-950/40" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 rounded-lg bg-sky-950/40" />
          <div className="h-4 w-1/3 rounded-lg bg-sky-950/40" />
        </div>
      </div>
    </div>
  );
}

function CandidateOption({ candidate, selected, onSelect }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(candidate.imageCID);
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
        selected
          ? "border-sky-400 bg-sky-400/10 shadow-neon-glow"
          : "border-app bg-app-elevated/40 hover:border-sky-400/35 hover:bg-app-elevated/70 hover:shadow-lg"
      }`}
    >
      {selected && (
        <div className="absolute top-0 right-0 p-3">
          <div className="bg-sky-400 text-slate-950 rounded-full p-0.5 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      <div className="p-5 flex items-center gap-3 sm:gap-5 sm:p-5">
        <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-app shadow-sm transition-transform group-hover:scale-105">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={candidate.name}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-300 via-emerald-500 to-sky-500 text-lg font-black text-slate-950">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 text-left">
          <p className={`font-bold text-lg truncate transition-colors ${selected ? "text-sky-300 text-glow-emerald" : "text-app-heading"}`}>
            {candidate.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-amber-200 bg-amber-400/10 border border-amber-300/25 px-2.5 py-0.5 rounded">
              {getPositionLabel(candidate.position)}
            </span>
            <span className="text-xs font-mono font-bold text-app-muted">#{candidate.studentId}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function VotingPanelV3() {
  const { wallet } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const contractLabel = `${CONTRACT_ADDRESS_V3.slice(0, 8)}...${CONTRACT_ADDRESS_V3.slice(-6)}`;
  const { success, error: showError } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [fetchingCandidates, setFetchingCandidates] = useState(false);
  const [casting, setCasting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [eligibleWallets, setEligibleWallets] = useState([]);

  const loadCandidates = async () => {
    setFetchingCandidates(true);
    try {
      const response = await fetch(`${API_URL}/api/candidates`);
      if (!response.ok) throw new Error("Failed to load candidates");
      const rows = await response.json();
      setCandidates(rows.map(c => ({
        id: Number(c.blockchain_id),
        name: c.name,
        studentId: c.student_id,
        imageCID: c.image_cid,
        position: c.position === "President" ? 0 : c.position === "Secretary" ? 1 : 2,
      })));
    } catch (err) {
      console.error(err);
      showError(err.message || "Could not load candidates from server.");
    } finally {
      setFetchingCandidates(false);
    }
  };

  const loadEligibleWallets = async () => {
    try {
      const response = await fetch(`${API_URL}/api/voters/pending`);
      if (!response.ok) throw new Error("Failed to load voter eligibility");
      const data = await response.json();
      setEligibleWallets(data.filter(s => s.eligible_to_vote).map(s => s.wallet_address));
    } catch (err) {
      console.error(err);
      showError(err.message || "Could not load voter eligibility list.");
    }
  };

  useEffect(() => {
    loadCandidates();
    loadEligibleWallets();
  }, []);

  const castVote = async () => {
    if (!wallet) {
      showError("Please connect your wallet first.");
      return;
    }
    if (!selectedId) {
      showError("Select a candidate to proceed.");
      return;
    }

    setCasting(true);
    try {
      let proof;
      try {
        const proofResponse = await fetch(`${API_URL}/api/voters/proof?wallet=${wallet}`);
        const data = await proofResponse.json();
        proof = data.proof;
      } catch {
        console.warn("Backend proof fetch failed, trying local generation...");
        proof = getProof(eligibleWallets, wallet);
      }

      if (!proof || proof.length === 0) {
        throw new Error("You are not eligible to vote (no Merkle proof found)");
      }

      const contract = await getContractV3();
      const tx = await contract.vote(selectedId, proof);
      await tx.wait();

      success("🎉 Vote cast successfully! Blockchain record confirmed.");
      setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
      console.error(err);
      showError(err.message || "Transaction failed");
    } finally {
      setCasting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl shadow-card border border-app overflow-hidden transform transition-all">
      <div className="ballot-header bg-gradient-to-r from-[#0a1020] via-[#0d1424] to-[#12213a] p-5 sm:p-8 text-white border-b border-app relative">
        <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-10 pointer-events-none">
          <span className="text-4xl sm:text-6xl text-sky-300" aria-hidden="true">🛡️</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="bg-sky-400/10 text-sky-300 text-xs font-mono tracking-widest px-3 py-1 rounded-full border border-sky-400/25 uppercase">
            V3 Protocol Active
          </span>
          <a
            href={`${SEPOLIA_EXPLORER}/address/${CONTRACT_ADDRESS_V3}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-amber-300/10 text-amber-200 text-xs font-mono tracking-widest px-3 py-1 rounded-full border border-amber-300/25 uppercase hover:border-amber-200/45 transition-colors"
            title={`Contract ${CONTRACT_ADDRESS_V3}`}
          >
            {SEPOLIA_NETWORK} · Chain {SEPOLIA_CHAIN_ID} · {contractLabel}
          </a>
          {balance && (
            <span
              className="bg-emerald-500/10 text-emerald-300 text-xs font-mono tracking-widest px-3 py-1 rounded-full border border-emerald-500/25 uppercase"
              title="Your Sepolia ETH balance"
            >
              Ξ {Number(balance).toFixed(4)} ETH
            </span>
          )}
          {balance !== null && Number(balance) < 0.001 && (
            <span
              className="bg-rose-500/15 text-rose-300 text-xs font-mono tracking-widest px-3 py-1 rounded-full border border-rose-500/30 uppercase animate-pulse"
              title="Insufficient gas"
            >
              ⚠️ Low Gas
            </span>
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Electoral Ballot</h2>
        <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-lg leading-relaxed">
          Identity verified via Merkle Tree. Select one candidate. Your choice will be cryptographically sealed and recorded on the Ethereum ledger.
        </p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {fetchingCandidates ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CandidateSkeleton />
            <CandidateSkeleton />
            <CandidateSkeleton />
            <CandidateSkeleton />
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app bg-app-muted p-8 text-center">
            <p className="text-xs font-mono text-app-muted">No candidates registered in active election.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map(c => (
              <CandidateOption
                key={c.id}
                candidate={c}
                selected={selectedId === c.id}
                onSelect={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        )}

        <div className="pt-6 border-t border-app flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-app-muted border border-app p-4 rounded-2xl">
            <div className="bg-app-elevated border border-app p-2.5 rounded-xl shadow-sm text-lg">💡</div>
            <p className="text-sm text-app-body font-medium leading-relaxed">
              By clicking the button below, you will trigger a MetaMask signature.
              <span className="font-bold text-amber-200"> This action is irreversible.</span>
            </p>
          </div>

          <button
            onClick={castVote}
            disabled={casting || !wallet || !selectedId || fetchingCandidates}
            className="group relative w-full bg-gradient-to-r from-emerald-500 to-sky-400 text-slate-950 py-4.5 rounded-2xl font-black text-base uppercase tracking-widest shadow-neon-glow hover:brightness-110 hover:shadow-neon-intense hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all disabled:bg-emerald-950/20 disabled:text-emerald-500/40 disabled:border disabled:border-emerald-500/10 disabled:shadow-none disabled:translate-y-0 cursor-pointer"
          >
            <span className={casting ? "opacity-0" : "opacity-100"}>
              {selectedId ? "Confirm Selection & Sign Transaction" : "Select a Candidate to Vote"}
            </span>
            {casting && (
              <div className="absolute inset-0 flex items-center justify-center gap-3">
                <div className="h-5 w-5 border-[3px] border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                <span className="text-sm uppercase tracking-widest font-black">Encrypting Ballot & Publishing...</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
