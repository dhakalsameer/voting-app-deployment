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
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-yellow-500/10 p-4 sm:p-6 shadow-lg">
      <div className="absolute top-0 right-0 text-5xl sm:text-7xl opacity-10 select-none pointer-events-none">🏆</div>
      <div className="absolute bottom-0 left-0 text-4xl sm:text-6xl opacity-10 select-none pointer-events-none rotate-12">⭐</div>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="text-2xl sm:text-4xl shrink-0 mt-1">{posIcon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg sm:text-2xl">🎉</span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">Winner</span>
          </div>
          <h3 className="text-base sm:text-xl font-black text-app-heading mt-1 leading-tight">
            Congratulations, {winnerInfo.name}!
          </h3>
          <p className="text-xs sm:text-sm text-app-muted-text mt-1 leading-relaxed">
            The votes are in — and your vision won. Time to deliver.
          </p>
        </div>
      </div>
      <div className="mt-4 sm:mt-5 grid grid-cols-[auto_1fr] gap-3 sm:gap-4 rounded-xl border border-amber-400/20 bg-app-surface/80 px-4 sm:px-5 py-3 sm:py-4">
        <div className="row-span-2 flex flex-col items-center gap-1.5 sm:gap-2">
          {imgSrc ? (
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 border-amber-400/50 shrink-0">
              <img src={imgSrc} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400/30 flex items-center justify-center shrink-0">
              <span className="text-lg sm:text-2xl">🏆</span>
            </div>
          )}
          <span className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold uppercase tracking-wider ${
            isFemale ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
          }`}>{winnerInfo.gender || "—"}</span>
        </div>
        <div className="min-w-0 self-end">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
            <span className="text-[11px] sm:text-sm font-black uppercase tracking-widest text-amber-400">{winnerInfo.position}</span>
            <span className="w-1 h-1 rounded-full bg-amber-400/30 shrink-0" />
            <span className="text-base sm:text-xl font-black text-app-heading">{Number(winnerInfo.voteCount)} <span className="text-[11px] sm:text-sm font-bold text-app-muted-text font-sans">vote{Number(winnerInfo.voteCount) !== 1 ? "s" : ""}</span></span>
          </div>
          <p className="text-sm sm:text-lg font-black text-app-heading mt-0.5">{winnerInfo.name}</p>
        </div>
        <div className="col-start-2 self-start">
          {winnerInfo.year && (
            <span className="text-[11px] sm:text-sm font-mono font-bold text-app-muted-text bg-app-muted/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md">{fmtYear(winnerInfo.year)}</span>
          )}
        </div>
      </div>
      <p className="text-[10px] sm:text-xs text-app-muted-text mt-3 sm:mt-4 text-center border-t border-app/50 pt-3 sm:pt-4">
        The IT Club is yours to shape. Lead with purpose. ✨
      </p>
    </div>
  );
}
