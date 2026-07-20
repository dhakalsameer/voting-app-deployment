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
  const [loading, setLoading] = useState(true);
  const [electionOver, setElectionOver] = useState(false);
  const [winners, setWinners] = useState([]);
  const [isWinner, setIsWinner] = useState(false);

  const myWallet = wallet?.toLowerCase();

  useEffect(() => {
    if (!myWallet) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contract/phase`);
        const phaseData = await res.json();
        if (cancelled) return;

        const over = phaseData.phase === 3 || phaseData.phase === 0;
        setElectionOver(over);

        if (!over) {
          setWinners([]);
          setIsWinner(false);
          setLoading(false);
          return;
        }

        const historyRes = await fetch(`${API_URL}/api/results/history`);
        const history = await historyRes.json();
        if (cancelled) return;

        if (!history || history.length === 0) {
          setLoading(false);
          return;
        }

        const latest = history[0];
        const allWinners = (latest.candidates || []).filter((c) => c.is_winner);
        setWinners(allWinners);

        const matched = allWinners.some((w) => {
          const wWallet = (w.wallet_address || "").toLowerCase();
          if (wWallet && wWallet === myWallet) return true;
          return false;
        });
        setIsWinner(matched);
      } catch (err) {
        console.error("Winner check failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [myWallet]);

  if (loading || !electionOver || winners.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-yellow-500/10 p-4 sm:p-6 shadow-lg">
      <div className="absolute top-0 right-0 text-5xl sm:text-7xl opacity-10 select-none pointer-events-none">🏆</div>
      <div className="absolute bottom-0 left-0 text-4xl sm:text-6xl opacity-10 select-none pointer-events-none rotate-12">⭐</div>
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="text-lg sm:text-2xl">🎉</span>
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">Election Results</span>
      </div>
      {isWinner && (
        <h3 className="text-base sm:text-xl font-black text-app-heading mb-3 leading-tight">
          Congratulations! You won!
        </h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {winners.map((w, i) => {
          const imgSrc = getImageUrl(w.photo || w.image_cid);
          const isFemale = w.gender === "female";
          const posIcon = w.position === "President" ? "🏛️" : w.position === "Secretary" ? "📜" : "👥";
          const wWallet = (w.wallet_address || "").toLowerCase();
          const isMe = wWallet && wWallet === myWallet;
          return (
            <div key={i} className={`rounded-xl border px-4 py-3 ${isMe ? "border-amber-400/60 bg-amber-400/10" : "border-amber-400/20 bg-app-surface/80"}`}>
              <div className="flex items-start gap-3">
                <div className="text-xl sm:text-2xl shrink-0 mt-0.5">{posIcon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">{w.position}</span>
                    {isMe && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">You</span>}
                  </div>
                  <p className="text-sm sm:text-base font-black text-app-heading">{w.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {w.year && <span className="text-[10px] font-mono font-bold text-app-muted-text">{fmtYear(w.year)}</span>}
                    {w.gender && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isFemale ? "text-pink-400 bg-pink-500/10" : "text-sky-400 bg-sky-500/10"
                      }`}>{w.gender}</span>
                    )}
                    <span className="text-sm font-black text-app-heading">{Number(w.vote_count)} <span className="text-[10px] font-bold text-app-muted-text">votes</span></span>
                  </div>
                </div>
                {imgSrc && (
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-amber-400/30 shrink-0">
                    <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] sm:text-xs text-app-muted-text mt-3 sm:mt-4 text-center border-t border-app/50 pt-3 sm:pt-4">
        The IT Club is yours to shape. Lead with purpose. ✨
      </p>
    </div>
  );
}
