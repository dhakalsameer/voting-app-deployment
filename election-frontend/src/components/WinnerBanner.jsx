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

const WINNER_EMOJIS = ["🏆", "👑", "🌟", "💫", "✨", "🎊", "🎉", "⭐", "💎", "🔥"];

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/30 bg-gradient-to-br from-yellow-950 via-amber-950 to-orange-950 p-2 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,200,50,0.3),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_120%,rgba(255,150,50,0.2),transparent)] pointer-events-none" />

      {/* Animated floating emojis */}
      {WINNER_EMOJIS.map((emoji, i) => (
        <span
          key={i}
          className="absolute select-none pointer-events-none animate-pulse"
          style={{
            top: `${10 + Math.sin(i * 1.2) * 40 + 20}%`,
            left: `${(i / WINNER_EMOJIS.length) * 90 + 5}%`,
            fontSize: `${0.8 + (i % 3) * 0.4}rem`,
            opacity: 0.15 + (i % 4) * 0.08,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Shine sweep */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.08)_55%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 rounded-xl border border-amber-400/20 bg-gradient-to-b from-amber-400/10 to-transparent p-6 sm:p-8 backdrop-blur-[2px]">
        {/* Top crown */}
        <div className="flex flex-col items-center mb-6">
          <span className="text-5xl sm:text-7xl mb-2 drop-shadow-[0_0_20px_rgba(255,200,0,0.5)]">👑</span>
          <h3 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 leading-tight drop-shadow-[0_2px_10px_rgba(255,200,0,0.3)]">
            Congratulations!
          </h3>
          <p className="text-base sm:text-lg font-semibold text-amber-300/80 mt-1">You won the election</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {myWins.map((w, i) => {
            const imgSrc = getImageUrl(w.photo || w.image_cid);
            const isFemale = w.gender === "female";
            const posKey = w.position === "President" ? "prez" : w.position === "Secretary" ? "sec" : "gm";
            const accentColors = {
              prez: "from-yellow-400/30 via-amber-500/20 to-orange-500/30 border-yellow-400/40",
              sec: "from-sky-400/30 via-blue-500/20 to-indigo-500/30 border-sky-400/40",
              gm: "from-emerald-400/30 via-teal-500/20 to-cyan-500/30 border-emerald-400/40",
            };
            const badgeColors = {
              prez: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
              sec: "bg-sky-500/20 text-sky-300 border-sky-400/30",
              gm: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
            };
            const posEmoji = w.position === "President" ? "🏛️" : w.position === "Secretary" ? "📜" : "👥";
            return (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentColors[posKey]} p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300`}
              >
                <div className="absolute -top-8 -right-8 text-6xl opacity-10 select-none pointer-events-none">{posEmoji}</div>
                <div className="flex flex-col items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-white/5 blur-sm" />
                    {imgSrc ? (
                      <div className="relative h-22 w-22 sm:h-26 sm:w-26 rounded-full overflow-hidden ring-4 ring-white/20 shadow-[0_0_30px_rgba(255,200,0,0.3)]">
                        <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="relative h-22 w-22 sm:h-26 sm:w-26 rounded-full bg-gradient-to-br from-white/20 to-white/5 ring-4 ring-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,200,0,0.3)]">
                        <span className="text-3xl">{posEmoji}</span>
                      </div>
                    )}
                  </div>

                  {/* Position badge */}
                  <div className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${badgeColors[posKey]}`}>
                    {w.position}
                  </div>

                  {/* Name */}
                  <p className="text-xl sm:text-2xl font-black text-white text-center leading-tight drop-shadow-md">{w.name}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {w.year && (
                      <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2.5 py-1 rounded-full">{fmtYear(w.year)}</span>
                    )}
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      isFemale ? "text-pink-300 bg-pink-400/15" : "text-sky-300 bg-sky-400/15"
                    }`}>{w.gender}</span>
                  </div>

                  {/* Vote count */}
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 border border-white/10">
                    <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-200">
                      {Number(w.vote_count)}
                    </span>
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">votes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom flourish */}
        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-amber-300/60 italic">Election {new Date().getFullYear()} &middot; Decentralized &middot; Transparent</p>
        </div>
      </div>
    </div>
  );
}
