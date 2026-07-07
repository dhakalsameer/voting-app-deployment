import { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL } from "../config";

const POSITION_LABELS = {
  President: "President",
  Secretary: "Secretary",
  General: "General Member",
};

function getImageUrl(cid) {
  if (!cid) return null;
  if (cid.startsWith("local:")) return `${API_URL}/uploads/${cid.slice(6)}`;
  if (cid.startsWith("http")) return cid;
  return `https://ipfs.io/ipfs/${cid}`;
}

function fmtYear(y) {
  if (!y) return "";
  const n = parseInt(y, 10);
  if (Number.isFinite(n)) return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"} Year`;
  return y;
}

export default function WinnerBanner() {
  const { wallet } = useContext(AuthContext);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contract/phase`);
        const phaseData = await res.json();
        if (cancelled) return;

        const isOver = phaseData.phase === 3 || phaseData.phase === 0;

        if (!isOver) {
          setWinnerInfo(null);
          setLoading(false);
          return;
        }

        const [candRes, resultsRes] = await Promise.all([
          fetch(`${API_URL}/api/candidates/by-wallet/${wallet}`),
          fetch(`${API_URL}/api/results/history`),
        ]);

        if (cancelled) return;

        const candidate = await candRes.json();
        const history = await resultsRes.json();

        if (!candidate || !history || history.length === 0) {
          setLoading(false);
          return;
        }

        const latest = history[0];
        const winner = latest.candidates?.find(
          (c) => c.is_winner && c.name === candidate.name
        );

        if (winner) {
          setWinnerInfo({
            name: candidate.name,
            position: candidate.position,
            voteCount: winner.vote_count,
            year: winner.year,
            gender: winner.gender,
            photo: winner.photo,
          });
        }
      } catch (err) {
        console.error("Winner check failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [wallet]);

  if (loading || !winnerInfo) return null;

  const imgSrc = getImageUrl(winnerInfo.photo);
  const posLabel = POSITION_LABELS[winnerInfo.position] || winnerInfo.position;
  const isFemale = winnerInfo.gender === "female";

  return (
    <div className="rounded-xl border border-[var(--app-trust-border)] bg-gradient-to-br from-[var(--app-trust-soft)] via-[var(--app-accent-soft)] to-[var(--app-ballot-soft)] p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">🎉</span>
        <div>
          <h3 className="text-base font-bold text-app-heading">You Did It, {winnerInfo.name}!</h3>
          <p className="text-xs text-app-muted-text">Your peers trust you to lead. Make them proud.</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] px-5 py-4">
        {imgSrc ? (
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-[var(--app-accent)] shrink-0">
            <img src={imgSrc} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--app-trust-soft)] to-[var(--app-accent-soft)] border-2 border-[var(--app-accent-border)] flex items-center justify-center shrink-0">
            <span className="text-2xl">🏆</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)] mb-1">{posLabel}</p>
          <p className="text-lg font-bold text-app-heading break-words">{winnerInfo.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {winnerInfo.year && (
              <span className="text-xs text-app-muted-text whitespace-nowrap">{fmtYear(winnerInfo.year)}</span>
            )}
            {winnerInfo.gender && (
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                isFemale ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
              }`}>{winnerInfo.gender}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-[var(--app-accent)]">{Number(winnerInfo.voteCount)}</p>
          <p className="text-[10px] text-app-muted-text">votes</p>
        </div>
      </div>
      <p className="text-[11px] text-app-muted-text mt-3 text-center italic">
        Your leadership will shape the future of the IT Club. Lead with integrity.
      </p>
    </div>
  );
}
