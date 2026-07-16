import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL } from "../config";

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
  const isFemale = winnerInfo.gender === "female";

  const posIcon = winnerInfo.position === "President" ? "🏛️" : winnerInfo.position === "Secretary" ? "📜" : "👥";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-yellow-500/10 p-6 shadow-lg">
      <div className="absolute top-0 right-0 text-7xl opacity-10 select-none pointer-events-none">🏆</div>
      <div className="absolute bottom-0 left-0 text-6xl opacity-10 select-none pointer-events-none rotate-12">⭐</div>
      <div className="flex items-start gap-4">
        <div className="text-4xl shrink-0 mt-1">{posIcon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎉</span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">Winner</span>
          </div>
          <h3 className="text-xl font-black text-app-heading mt-1">
            Congratulations, {winnerInfo.name}!
          </h3>
          <p className="text-sm text-app-muted-text mt-1 leading-relaxed">
            The votes are in — and your vision won. Time to deliver.
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-4 rounded-xl border border-app bg-app-surface/60 px-5 py-4">
        {imgSrc ? (
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-amber-400/50 shrink-0">
            <img src={imgSrc} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400/30 flex items-center justify-center shrink-0">
            <span className="text-2xl">🏆</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">{winnerInfo.position}</p>
            <span className="text-amber-400/40">·</span>
            <p className="text-[10px] font-bold text-app-muted-text">{Number(winnerInfo.voteCount)} votes</p>
          </div>
          <p className="text-base font-bold text-app-heading mt-0.5">{winnerInfo.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {winnerInfo.year && (
              <span className="text-xs text-app-muted-text">{fmtYear(winnerInfo.year)}</span>
            )}
            {winnerInfo.gender && (
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                isFemale ? "text-pink-500 bg-pink-500/10" : "text-app-accent bg-app-accent/10"
              }`}>{winnerInfo.gender}</span>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-app-muted-text mt-4 text-center border-t border-app/50 pt-4">
        The IT Club is yours to shape. Lead with purpose. ✨
      </p>
    </div>
  );
}
