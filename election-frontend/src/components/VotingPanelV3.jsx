import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL } from "../config";
import { getProof } from "../utils/merkle";
import { useBalance } from "../hooks/useBalance";
import { useToast } from "./ui/Toast";

function getImageUrl(cid) {
  if (!cid) return "";
  if (cid.startsWith("http")) return cid;
  return `https://ipfs.io/ipfs/${cid}`;
}

const POSITIONS = [
  { key: 0, label: "President", icon: "🏛️", color: "sky" },
  { key: 1, label: "Secretary", icon: "📋", color: "amber" },
  { key: 2, label: "General Member", icon: "👥", color: "emerald" },
];

function CandidateCard({ candidate, selected, onSelect }) {
  const [imgErr, setImgErr] = useState(false);
  const url = getImageUrl(candidate.imageCID);
  const initials = candidate.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={`group relative flex items-center gap-3 w-full p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
        selected
          ? "border-sky-400 bg-sky-400/5 shadow-[0_0_12px_rgba(56,189,248,0.08)]"
          : "border-app bg-app-elevated/30 hover:bg-app-elevated/50 hover:border-app-border-soft"
      }`}
    >
      <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-app">
        {url && !imgErr ? (
          <img src={url} alt="" className="h-full w-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-300 via-emerald-500 to-sky-500 text-xs font-black text-slate-950">
            {initials}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${selected ? "text-sky-300" : "text-app-heading"}`}>
          {candidate.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-mono text-app-muted-text">ID #{candidate.id}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            candidate.position === 0 ? "bg-sky-500/10 text-sky-400" :
            candidate.position === 1 ? "bg-amber-500/10 text-amber-400" :
            "bg-emerald-500/10 text-emerald-400"
          }`}>
            {candidate.position === 0 ? "President" : candidate.position === 1 ? "Secretary" : "General Member"}
          </span>
        </div>
      </div>

      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
        selected ? "border-sky-400 bg-sky-400/10" : "border-app-border"
      }`}>
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-ping-once" />}
      </div>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-app bg-app-elevated/20 animate-pulse">
      <div className="h-12 w-12 rounded-lg bg-app-border/30" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-2/3 rounded bg-app-border/30" />
        <div className="h-3 w-1/3 rounded bg-app-border/20" />
      </div>
    </div>
  );
}

export default function VotingPanelV3() {
  const { wallet } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const { success, error: showError } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [casting, setCasting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [eligibleWallets, setEligibleWallets] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [cRes, vRes] = await Promise.all([
          fetch(`${API_URL}/api/candidates`),
          fetch(`${API_URL}/api/voters/pending`),
        ]);

        if (!cancelled) {
          const rows = await cRes.json();
          setCandidates(
            rows
              .filter(c => {
                const id = Number(c.blockchain_id);
                return Number.isFinite(id) && id > 0;
              })
              .map(c => ({
                id: Number(c.blockchain_id),
                name: c.name,
                imageCID: c.image_cid,
                position: c.position === "President" ? 0 : c.position === "Secretary" ? 1 : 2,
              }))
          );

          const vData = await vRes.json();
          setEligibleWallets(vData.filter(s => s.eligible_to_vote).map(s => s.wallet_address));
        }
      } catch (err) {
        if (!cancelled) showError("Failed to load candidates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    const groups = { 0: [], 1: [], 2: [] };
    for (const c of candidates) {
      if (groups[c.position] !== undefined) groups[c.position].push(c);
    }
    return groups;
  }, [candidates]);

  const totalCandidates = candidates.length;

  const castVote = async () => {
    if (!wallet || selectedId == null || Number.isNaN(selectedId)) return;
    setCasting(true);
    try {
      let proof;
      try {
        const res = await fetch(`${API_URL}/api/voters/proof?wallet=${wallet}`);
        const data = await res.json();
        proof = data.proof;
      } catch {
        proof = getProof(eligibleWallets, wallet);
      }

      if (!proof?.length) throw new Error("Not eligible to vote");
      if (!Number.isFinite(selectedId)) throw new Error("Invalid candidate selection");

      const contract = await getContractV3();
      const tx = await contract.vote(selectedId, proof);
      const txHash = tx.hash;
      await tx.wait();

      success("Vote cast", { txHash });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showError(err.message || "Transaction failed");
    } finally {
      setCasting(false);
    }
  };

  const selectedCandidate = useMemo(
    () => candidates.find(c => c.id === selectedId),
    [candidates, selectedId]
  );

  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-app flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Cast your vote</h2>
          {totalCandidates > 0 && (
            <p className="text-xs text-app-muted-text mt-0.5">
              {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""} · Select one to vote
            </p>
          )}
        </div>
        {balance && (
          <span className="text-sm font-mono text-app-muted-text">{Number(balance).toFixed(4)} ETH</span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton /><Skeleton /><Skeleton />
          </div>
        ) : totalCandidates === 0 ? (
          <div className="py-8 text-center">
            <p className="text-base text-app-muted-text">No candidates registered</p>
          </div>
        ) : (
          POSITIONS.map(pos => {
            const group = grouped[pos.key];
            if (!group || group.length === 0) return null;
            return (
              <div key={pos.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{pos.icon}</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-app-heading">{pos.label}</h3>
                  <span className="text-[10px] font-mono text-app-muted-text bg-app-muted/50 px-1.5 py-0.5 rounded">
                    {group.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.map(c => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={selectedId === c.id}
                      onSelect={() => setSelectedId(c.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}

        {totalCandidates > 0 && (
          <div className="space-y-3 pt-2 border-t border-app/50">
            {selectedCandidate && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-center">
                <p className="text-xs text-sky-400">
                  Voting for <span className="font-bold">{selectedCandidate.name}</span>
                  {" "}· {selectedCandidate.position === 0 ? "President" : selectedCandidate.position === 1 ? "Secretary" : "General Member"}
                </p>
              </div>
            )}
            <button
              onClick={castVote}
              disabled={casting || selectedId == null}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 text-base font-bold uppercase tracking-wide hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {casting ? "Confirming on-chain…" : selectedId != null ? "Vote" : "Select a candidate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
