import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL } from "../config";
import { getProof } from "../utils/merkle";
import { useBalance } from "../hooks/useBalance";
import { useToast } from "./ui/Toast";
import { formatContractError } from "../utils/errors";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

function formatRemaining(seconds) {
  if (seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const p = (v) => String(v).padStart(2, "0");
  if (h > 0) return `${h}h ${p(m)}m ${p(s)}s`;
  if (m > 0) return `${m}m ${p(s)}s`;
  return `${s}s`;
}

function getImageUrl(cid) {
  if (!cid) return "";
  if (cid.startsWith("http")) return cid;
  if (cid.startsWith("local:")) return `${API_URL}/uploads/${cid.slice(6)}`;
  return `https://ipfs.io/ipfs/${cid}`;
}

const GM_MAX = 5;
const GM_MIN_FEMALE = 2;

const PHASE_NAMES = ["Created", "Registration", "Voting", "Ended"];

function CandidateCard({ candidate, selected, onToggle, disabled: forceDisabled, showVoteCount }) {
  const [imgErr, setImgErr] = useState(false);
  const url = getImageUrl(candidate.imageCID);
  const initials = candidate.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const disabled = forceDisabled;

  return (
    <button
      onClick={() => !disabled && onToggle(candidate.id)}
      disabled={disabled}
      className={`group relative flex flex-col items-center gap-2 w-full p-3 rounded-xl border-2 transition-all cursor-pointer ${
        disabled ? "opacity-30 cursor-not-allowed" : ""
      } ${
        selected
          ? "border-sky-400 bg-sky-400/5 shadow-[0_0_12px_rgba(56,189,248,0.08)]"
          : "border-app bg-app-elevated/30 hover:bg-app-elevated/50 hover:border-app-border-soft"
      }`}
    >
      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-app">
        {url && !imgErr ? (
          <img src={url} alt="" className="h-full w-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-300 via-emerald-500 to-sky-500 text-base font-black text-slate-950">
            {initials}
          </div>
        )}
      </div>

      <div className="w-full text-center min-w-0">
        <p className={`text-sm font-semibold truncate ${selected ? "text-sky-300" : "text-app-heading"}`}>
          {candidate.name}
        </p>
        {candidate.studentId && (
          <p className="text-xs font-mono text-app-muted-text truncate">{candidate.studentId}</p>
        )}
        {candidate.year && (
          <p className="text-xs font-mono text-app-muted-text">{candidate.year} Year</p>
        )}
        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
          {candidate.isFemale !== undefined && (
            <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
              candidate.isFemale ? "bg-pink-500/10 text-pink-400" : "bg-sky-500/10 text-sky-400"
            }`}>
              {candidate.isFemale ? "Female" : "Male"}
            </span>
          )}
        </div>
        {showVoteCount && (
          <p className="text-xs font-mono mt-1 text-app-accent">{candidate.voteCount} vote{candidate.voteCount !== 1 ? "s" : ""}</p>
        )}
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
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-app bg-app-elevated/20 animate-pulse">
      <div className="h-16 w-16 rounded-xl bg-app-border/30" />
      <div className="w-full space-y-1.5 text-center">
        <div className="h-3.5 w-3/4 rounded bg-app-border/30 mx-auto" />
        <div className="h-3 w-1/2 rounded bg-app-border/20 mx-auto" />
      </div>
    </div>
  );
}

export default function VotingPanelV3() {
  const { wallet, voterStatus, checkVoterStatus } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const { success, error: showError } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [casting, setCasting] = useState(false);
  const [selectedPresidentId, setSelectedPresidentId] = useState(null);
  const [selectedSecretaryId, setSelectedSecretaryId] = useState(null);
  const [selectedGMIds, setSelectedGMIds] = useState([]);
  const [eligibleWallets, setEligibleWallets] = useState([]);
  const [phase, setPhase] = useState(null);
  const [votingEnd, setVotingEnd] = useState(null);
  const [regEnd, setRegEnd] = useState(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const contract = await getContractV3();
        const p = Number(await contract.getPhase());
        if (cancelled) return;
        setPhase(p);

        const ve = Number(await contract.votingEnd());
        if (!cancelled) setVotingEnd(ve);
        const re = Number(await contract.registrationEnd());
        if (!cancelled) setRegEnd(re);

        const count = Number(await contract.candidateCount());
        const rows = [];
        for (let i = 1; i <= count; i++) {
          const c = await contract.getCandidate(i);
          if (c.exists) {
            rows.push({
              id: Number(c.id),
              name: c.name,
              studentId: c.studentId,
              imageCID: c.imageCID,
              position: Number(c.position),
              isFemale: c.isFemale,
              year: Number(c.year),
              voteCount: Number(c.voteCount),
            });
          }
        }
        if (!cancelled) setCandidates(rows);

        const vRes = await fetch(`${API_URL}/api/voters/pending`);
        if (!cancelled) {
          const vData = await vRes.json();
          setEligibleWallets(vData.filter(s => s.eligible_to_vote).map(s => s.wallet_address));
        }
      } catch (err) {
        if (!cancelled) showError("Failed to load candidates from chain");
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

  const votingPhaseActive = phase === 2 && votingEnd && now < votingEnd;

  const selectPresident = (id) => {
    setSelectedPresidentId(prev => prev === id ? null : id);
  };

  const selectSecretary = (id) => {
    setSelectedSecretaryId(prev => prev === id ? null : id);
  };

  const toggleGM = (id) => {
    setSelectedGMIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= GM_MAX) return prev;
      return [...prev, id];
    });
  };

  const gmFemaleSelected = useMemo(
    () => selectedGMIds.filter(id => candidates.find(c => c.id === id)?.isFemale).length,
    [selectedGMIds, candidates]
  );

  const gmFemaleRemaining = useMemo(
    () => candidates.filter(c => c.position === 2 && c.isFemale && !selectedGMIds.includes(c.id)).length,
    [selectedGMIds, candidates]
  );

  const disableFemale = selectedGMIds.length >= GM_MAX;
  const disableMale = selectedGMIds.length >= GM_MAX;

  const totalSelected = (selectedPresidentId ? 1 : 0) +
    (selectedSecretaryId ? 1 : 0) +
    selectedGMIds.length;

  const canVote = votingPhaseActive && voterStatus.canVote;
  const canSubmit = canVote && totalSelected > 0 &&
    (selectedGMIds.length === 0 || gmFemaleSelected >= GM_MIN_FEMALE);

  const castVote = async () => {
    if (!wallet || !canSubmit) return;
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

      const contract = await getContractV3();
      const tx = await contract.castVote(
        selectedPresidentId || 0,
        selectedSecretaryId || 0,
        selectedGMIds,
        proof
      );
      const txHash = tx.hash;
      await tx.wait();

      success("Vote cast", { txHash });
      if (checkVoterStatus) checkVoterStatus(wallet);
      setSelectedPresidentId(null);
      setSelectedSecretaryId(null);
      setSelectedGMIds([]);
    } catch (err) {
      showError(formatContractError(err, "Transaction failed"));
    } finally {
      setCasting(false);
    }
  };

  const selectedName = (id) => candidates.find(c => c.id === id)?.name;
  const showVoteCount = phase === 3;

  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-app flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Cast Your Ballot</h2>
          {totalCandidates > 0 && (
            <p className="text-sm text-app-muted-text mt-0.5">
              {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}
              {phase !== null && ` · ${PHASE_NAMES[phase]} Phase`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(phase === 1 || phase === 2) && (
            <div className="text-right">
              {phase === 2 && votingEnd && (
                <>
                  <p className="text-xs uppercase tracking-wider text-app-muted-text leading-tight">Voting ends</p>
                  <p className="text-xs font-mono font-bold text-app-accent">{formatTime(votingEnd)}</p>
                  <p className="text-xs font-mono text-emerald-400">{formatRemaining(votingEnd - now)}</p>
                </>
              )}
              {phase === 1 && regEnd && (
                <>
                  <p className="text-xs uppercase tracking-wider text-app-muted-text leading-tight">Registration ends</p>
                  <p className="text-xs font-mono font-bold text-app-accent">{formatTime(regEnd)}</p>
                  <p className="text-xs font-mono text-emerald-400">{formatRemaining(regEnd - now)}</p>
                </>
              )}
            </div>
          )}
          {balance && (
            <span className="text-sm font-mono text-app-muted-text">{Number(balance).toFixed(4)} ETH</span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Skeleton /><Skeleton /><Skeleton />
          </div>
        ) : totalCandidates === 0 ? (
          <div className="py-8 text-center">
            <p className="text-base text-app-muted-text">No candidates registered</p>
          </div>
        ) : (
          <>
            {!voterStatus.hasVoted && !votingPhaseActive && phase !== null && phase !== 2 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <p className="text-sm text-amber-400 font-medium">
                  {phase === 0 || phase === 1
                    ? "Voting has not started yet. Check back during the voting phase."
                    : phase === 3
                      ? "This election has ended. View the results tab for final outcomes."
                      : "Voting is not currently active."}
                </p>
              </div>
            )}

            {voterStatus.hasVoted && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <p className="text-sm font-bold text-emerald-400">✓ You have already voted</p>
                <p className="text-sm text-app-muted-text mt-1">Candidates are shown for reference.</p>
              </div>
            )}

            {votingPhaseActive && !voterStatus.canVote && !voterStatus.hasVoted && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                <p className="text-sm text-amber-400 font-medium">
                  You are not eligible to vote. Make sure your wallet is connected and you are whitelisted.
                </p>
              </div>
            )}

            {/* President */}
            {grouped[0]?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🏛️</span>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-app-heading">
                    President{phase === 2 ? " (choose 1)" : ""}
                  </h3>
                  <span className="text-xs font-mono text-app-muted-text bg-app-muted/50 px-1.5 py-0.5 rounded">{grouped[0].length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped[0].map(c => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={selectedPresidentId === c.id}
                      onToggle={selectPresident}
                      disabled={!canVote}
                      showVoteCount={showVoteCount}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Secretary */}
            {grouped[1]?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">📋</span>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-app-heading">
                    Secretary{phase === 2 ? " (choose 1)" : ""}
                  </h3>
                  <span className="text-xs font-mono text-app-muted-text bg-app-muted/50 px-1.5 py-0.5 rounded">{grouped[1].length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped[1].map(c => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={selectedSecretaryId === c.id}
                      onToggle={selectSecretary}
                      disabled={!canVote}
                      showVoteCount={showVoteCount}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* General Member */}
            {grouped[2]?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">👥</span>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-app-heading">
                    General Member{phase === 2 ? ` (choose up to ${GM_MAX}, at least ${GM_MIN_FEMALE} female)` : ""}
                  </h3>
                  <span className="text-xs font-mono text-app-muted-text bg-app-muted/50 px-1.5 py-0.5 rounded">
                    {phase === 2 ? `${selectedGMIds.length}/${GM_MAX}` : `${grouped[2].length}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped[2].map(c => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={selectedGMIds.includes(c.id)}
                      onToggle={toggleGM}
                      disabled={!canVote || (!selectedGMIds.includes(c.id) && (c.isFemale ? disableFemale : disableMale))}
                      showVoteCount={showVoteCount}
                    />
                  ))}
                </div>
                {canVote && selectedGMIds.length > 0 && gmFemaleSelected < GM_MIN_FEMALE && (
                  <p className="text-xs text-rose-400 mt-2">
                    Select {GM_MIN_FEMALE - gmFemaleSelected} more female GM candidate{GM_MIN_FEMALE - gmFemaleSelected > 1 ? "s" : ""}
                  </p>
                )}
                {canVote && gmFemaleRemaining === 0 && gmFemaleSelected < GM_MIN_FEMALE && selectedGMIds.length < GM_MAX && (
                  <p className="text-xs text-rose-400 mt-1">
                    No more female GM candidates available
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {totalCandidates > 0 && (
          <div className="space-y-3 pt-2 border-t border-app/50">
            {canVote && totalSelected > 0 && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-center space-y-1">
                {selectedPresidentId && (
                  <p className="text-sm text-sky-400">President: <span className="font-bold">{selectedName(selectedPresidentId)}</span></p>
                )}
                {selectedSecretaryId && (
                  <p className="text-sm text-sky-400">Secretary: <span className="font-bold">{selectedName(selectedSecretaryId)}</span></p>
                )}
                {selectedGMIds.length > 0 && (
                  <p className="text-sm text-sky-400">
                    General Members ({selectedGMIds.length}):{" "}
                    <span className="font-bold">{selectedGMIds.map(id => selectedName(id)).join(", ")}</span>
                  </p>
                )}
              </div>
            )}
            {phase === 2 && (
              <button
                onClick={castVote}
                disabled={casting || !canSubmit}
                className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 text-base font-bold uppercase tracking-wide hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {casting ? "Confirming on-chain…" : canSubmit ? `Cast ${totalSelected} Vote${totalSelected > 1 ? "s" : ""}` : voterStatus.hasVoted ? "Already voted" : !votingPhaseActive ? "Voting not active" : "Select candidates"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
