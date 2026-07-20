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

  if (loading || !electionOver || winners.length === 0 || !isWinner) return null;

  const myWins = winners.filter((w) => {
    const wWallet = (w.wallet_address || "").toLowerCase();
    return wWallet && wWallet === myWallet;
  });

  const posIcon = (p) => p === "President" ? "🏛️" : p === "Secretary" ? "📜" : "👥";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-6 sm:p-8 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.12)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute -top-10 -right-10 text-[8rem] sm:text-[12rem] opacity-15 select-none pointer-events-none leading-none">🏆</div>
      <div className="absolute -bottom-8 -left-8 text-6xl sm:text-8xl opacity-15 select-none pointer-events-none rotate-12 leading-none">⭐</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.06)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-xs">🎉</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Winner</span>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 leading-tight drop-shadow-lg">
          Congratulations!
        </h3>
        <p className="text-base sm:text-lg font-bold text-white/80 mb-6">You won the election</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
          {myWins.map((w, i) => {
            const imgSrc = getImageUrl(w.photo || w.image_cid);
            const isFemale = w.gender === "female";
            return (
              <div key={i} className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-5 flex flex-col items-center gap-3 shadow-lg">
                <div className="text-3xl">{posIcon(w.position)}</div>
                {imgSrc ? (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-4 border-white/30 shadow-xl ring-2 ring-white/10">
                    <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center shadow-xl">
                    <span className="text-3xl">{posIcon(w.position)}</span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-[11px] font-black uppercase tracking-widest text-amber-300 mb-1">{w.position}</div>
                  <p className="text-lg sm:text-xl font-black text-white">{w.name}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    {w.year && <span className="text-[11px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full">{fmtYear(w.year)}</span>}
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      isFemale ? "text-pink-200 bg-pink-400/20" : "text-sky-200 bg-sky-400/20"
                    }`}>{w.gender}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-4 py-1.5 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-white">{Number(w.vote_count)}</span>
                  <span className="text-[11px] font-bold text-white/60">votes</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
