import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useTheme } from "../context/ThemeContext";
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

const WINNER_EMOJIS = ["🏆", "🌟", "💫", "✨", "🎊", "🎉", "⭐", "💎", "🔥", "🎯"];

export default function WinnerBanner() {
  const { wallet } = useContext(AuthContext);
  const { isDark } = useTheme();
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
    <div className={`relative overflow-hidden rounded-2xl border ${isDark ? "border-amber-400/20 bg-black" : "border-amber-300/40 bg-white"} p-2 shadow-2xl`}>
      <div className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,200,50,0.12),transparent)]" : "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,200,50,0.06),transparent)]"} pointer-events-none`} />
      <div className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(ellipse_60%_40%_at_50%_120%,rgba(255,150,50,0.08),transparent)]" : "bg-[radial-gradient(ellipse_60%_40%_at_50%_120%,rgba(255,200,50,0.04),transparent)]"} pointer-events-none`} />

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

      <div className={`relative z-10 rounded-xl border ${isDark ? "border-amber-400/15 bg-gradient-to-b from-amber-400/8 to-transparent" : "border-amber-300/30 bg-gradient-to-b from-amber-50 to-white"} p-4 sm:p-6 backdrop-blur-[2px]`}>
        {/* Top crown */}
        <div className="flex flex-col items-center mb-4">
          <span className="text-3xl sm:text-5xl mb-1 drop-shadow-[0_0_15px_rgba(255,200,0,0.5)]">🏆</span>
          <h3 className={`text-2xl sm:text-4xl font-black leading-tight drop-shadow-[0_2px_8px_rgba(255,200,0,0.3)] ${isDark ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200" : "text-amber-800"}`}>
            Congratulations!
          </h3>
          <p className={`text-sm sm:text-base font-semibold mt-0.5 ${isDark ? "text-amber-300/70" : "text-amber-600/70"}`}>You won the election</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {myWins.map((w, i) => {
            const imgSrc = getImageUrl(w.photo || w.image_cid);
            const isFemale = w.gender === "female";
            const posKey = w.position === "President" ? "prez" : w.position === "Secretary" ? "sec" : "gm";
            const borderColors = {
              prez: "border-yellow-400/30",
              sec: "border-sky-400/30",
              gm: "border-emerald-400/30",
            };
            const badgeColors = {
              prez: "bg-yellow-500/15 text-yellow-300",
              sec: "bg-sky-500/15 text-sky-300",
              gm: "bg-emerald-500/15 text-emerald-300",
            };
            const glowColors = {
              prez: "rgba(255,200,0,0.25)",
              sec: "rgba(100,200,255,0.2)",
              gm: "rgba(50,255,150,0.2)",
            };
            const posEmoji = w.position === "President" ? "🏛️" : w.position === "Secretary" ? "📜" : "👥";
            return (
              <div
                key={i}
                className={`relative overflow-hidden rounded-xl border ${borderColors[posKey]} ${isDark ? "bg-amber-400/6" : "bg-amber-50/80"} p-4 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300`}
              >
                <div className="absolute -top-6 -right-6 text-4xl opacity-8 select-none pointer-events-none">{posEmoji}</div>
                <div className="flex flex-col items-center gap-2.5">
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`absolute inset-0 rounded-full ${isDark ? "bg-amber-400/15" : "bg-amber-300/30"} blur-[6px]`} />
                    {imgSrc ? (
                      <div className="relative h-16 w-16 sm:h-18 sm:w-18 rounded-full overflow-hidden ring-3 ring-white/15 shadow-[0_0_20px_var(--glow)]" style={{"--glow": glowColors[posKey]} as React.CSSProperties}>
                        <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className={`relative h-16 w-16 sm:h-18 sm:w-18 rounded-full ${isDark ? "bg-amber-400/10" : "bg-amber-200/50"} ring-3 ring-white/15 flex items-center justify-center`} style={{boxShadow: `0 0 20px ${glowColors[posKey]}`}}>
                        <span className="text-xl">{posEmoji}</span>
                      </div>
                    )}
                  </div>

                  {/* Position + Name */}
                  <div className="text-center">
                    <div className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full inline-block ${badgeColors[posKey]} mb-1`}>
                      {w.position}
                    </div>
                    <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight drop-shadow-sm">{w.name}</p>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {w.year && (
                      <span className="text-[9px] font-bold text-amber-700/70 dark:text-amber-200/60 bg-amber-100 dark:bg-amber-400/10 px-2 py-0.5 rounded-full">{fmtYear(w.year)}</span>
                    )}
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isFemale ? "text-pink-300 bg-pink-400/12" : "text-sky-300 bg-sky-400/12"
                    }`}>{w.gender}</span>
                  </div>

                  {/* Votes pill */}
                  <div className="flex items-center gap-1 bg-amber-100/80 dark:bg-amber-400/10 backdrop-blur-sm rounded-full px-3 py-1 border border-amber-200/50 dark:border-amber-400/10">
                    <span className="text-lg sm:text-xl font-black text-amber-700 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-yellow-200 dark:to-amber-200">
                      {Number(w.vote_count)}
                    </span>
                    <span className="text-[9px] font-bold text-amber-700/50 dark:text-white/40 uppercase tracking-wider">votes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom flourish */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-medium text-amber-600/50 dark:text-amber-300/40 italic">Decentralized &middot; Transparent &middot; Verifiable</p>
        </div>
      </div>
    </div>
  );
}
