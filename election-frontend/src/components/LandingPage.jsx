import { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContextValue";
import { SEPOLIA_EXPLORER, API_URL } from "../config";
import WalletButton from "./WalletButton";

const TIME_AGO = (ts) => {
  const sec = Math.floor(Date.now() / 1000 - (ts || 0));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

const EVENT_LABELS = {
  VoteCast:            { icon: "🗳️", label: "Vote Cast" },
  BallotCast:          { icon: "📜", label: "Ballot Cast" },
  CandidateRegistered: { icon: "👤", label: "Candidate Registered" },
  PhaseChanged:        { icon: "🔄", label: "Phase Changed" },
  NewElectionStarted:  { icon: "🗳️", label: "New Election" },
};

const EVENT_CARD_COLORS = {
  VoteCast:            { border: "border-emerald-500/20", bar: "bg-emerald-500",    text: "text-emerald-400", glow: "shadow-emerald-500/20", from: "from-emerald-500/10", to: "to-emerald-600/5" },
  BallotCast:          { border: "border-emerald-500/20", bar: "bg-emerald-500",    text: "text-emerald-400", glow: "shadow-emerald-500/20", from: "from-emerald-500/10", to: "to-emerald-600/5" },
  CandidateRegistered: { border: "border-app-accent/20",  bar: "bg-app-accent",     text: "text-app-accent", glow: "shadow-app-accent/20",  from: "from-app-accent/10", to: "to-app-accent/5" },
  PhaseChanged:        { border: "border-amber-500/20",   bar: "bg-amber-500",      text: "text-amber-400",  glow: "shadow-amber-500/20",  from: "from-amber-500/10",  to: "to-amber-600/5" },
  NewElectionStarted:  { border: "border-rose-500/20",    bar: "bg-rose-500",       text: "text-rose-400",   glow: "shadow-rose-500/20",   from: "from-rose-500/10",   to: "to-rose-600/5" },
};
const DEFAULT_CARD_COLORS = { border: "border-app-border", bar: "bg-app-accent", text: "text-app-accent", glow: "shadow-app-accent/20", from: "from-app-accent/10", to: "to-app-accent/5" };

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function LandingPage({ onOpenPortal }) {
  const { wallet } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let pollCount = 0;

    const poll = async () => {
      try {
        pollCount++;
        if (pollCount === 1 || pollCount % 4 === 0) {
          const res = await fetch(`${API_URL}/api/events?limit=20`);
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            if (!mounted) return;
            const mapped = (data || []).map(e => ({
              eventName: e.eventName,
              blockNumber: e.blockNumber,
              txHash: e.txHash,
              fromAddress: e.fromAddress,
              ts: e.timestamp,
              icon: (EVENT_LABELS[e.eventName] || {}).icon || "🔗",
              label: (EVENT_LABELS[e.eventName] || {}).label || e.eventName,
              args: e.args || {},
            }));
            setEvents(mapped.slice(0, 8));
            setEventsLoading(false);
          }
        }
      } catch (err) {
        console.error("LandingPage poll error:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden"
    >
      <div className="relative max-w-full px-4 lg:px-8">
        <div className="mb-6">
          <div className="flex items-baseline justify-center gap-x-6 gap-y-2 flex-wrap">
            <h1 className="sm:text-6xl text-2xl font-bold tracking-wide text-app-accent-dark whitespace-nowrap">
              Gandaki University
            </h1>
            <h2 className="sm:text-7xl text-4xl font-black tracking-tight text-app-heading whitespace-nowrap">
              IT Club
            </h2>
          </div>
        </div>
        <p className="text-base sm:text-xl text-app-muted-text font-medium mb-8 sm:mb-10 text-center leading-relaxed max-w-md mx-auto px-2">
          A decentralized on-chain voting system for the IT Club election
        </p>

        <div className="flex items-center justify-center gap-4 mb-10">
          <WalletButton />
          {!wallet && (
            <button onClick={onOpenPortal} className="btn-secondary text-base px-5 py-2.5 gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Student Portal
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 mt-8 sm:mt-12">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg className="h-5 w-5 sm:h-7 sm:w-7 text-app-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-sm sm:text-xl text-app-muted-text whitespace-nowrap">Onchain</span>
          </div>
          <span className="text-app-muted-text/30 text-base sm:text-lg hidden sm:inline">|</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <svg className="h-5 w-5 sm:h-7 sm:w-7 text-app-trust" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="text-sm sm:text-xl text-app-muted-text whitespace-nowrap">Transparent</span>
          </div>
          <span className="text-app-muted-text/30 text-base sm:text-lg hidden sm:inline">|</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <svg className="h-5 w-5 sm:h-7 sm:w-7 text-app-ballot" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M9 12l2 2 4-4" />
              <path d="M4 9h16" />
            </svg>
            <span className="text-sm sm:text-xl text-app-muted-text whitespace-nowrap">Secure</span>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center gap-4 mb-7 justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-app-border/30" />
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <h3 className="text-[11px] font-bold text-app-muted-text uppercase tracking-[0.2em]">Recent On-Chain Activity</h3>
            </div>
            <div className="h-px w-16 bg-gradient-to-r from-app-border/30 to-transparent" />
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="relative flex items-center justify-center">
                <span className="absolute h-10 w-10 animate-ping rounded-full bg-emerald-400/20" />
                <span className="absolute h-6 w-6 animate-pulse rounded-full bg-emerald-400/30" />
                <span className="relative block h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-app-heading tracking-wide">Listening for On-Chain Events</span>
                <span className="text-xs text-app-muted-text/50 font-mono">polling every 15s · Sepolia</span>
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
            >
              {events.slice(0, 4).map((ev, i) => {
                const cc = EVENT_CARD_COLORS[ev.eventName] || DEFAULT_CARD_COLORS;
                return (
                  <motion.a
                    key={`${ev.txHash ?? "no-tx"}-${ev.logIndex ?? i}`}
                    href={`${SEPOLIA_EXPLORER}/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={cardVariants}
                    className={`group relative flex flex-col rounded-2xl border ${cc.border} overflow-hidden transition-all duration-500 hover:scale-[1.04] hover:shadow-xl ${cc.glow} bg-app-surface/60 sm:bg-app-surface/30 backdrop-blur-sm w-full`}
                  >
                    <div className={`h-1.5 w-full shrink-0 bg-gradient-to-r ${cc.from} ${cc.to} ${cc.bar}`} />
                    <div className="flex flex-col items-center justify-center gap-3 p-5 flex-1 min-h-0 relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="flex flex-col items-center gap-2.5 relative z-10">
                        <span className="text-3xl drop-shadow-sm">{ev.icon}</span>
                        <span className={`text-sm font-bold ${cc.text} text-center leading-snug tracking-wide`}>{ev.label}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 relative z-10">
                        {ev.blockNumber && (
                          <span className="text-[10px] font-mono text-app-muted-text/40 font-medium">
                            #{ev.blockNumber.toLocaleString()}
                          </span>
                        )}
                        {ev.txHash && (
                          <div className="flex items-center gap-1.5 text-[10px] text-app-muted-text/50 font-mono bg-app-surface/50 rounded-full px-2.5 py-1 border border-app-border/30 group-hover:border-app-accent/20 transition-colors duration-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                            {ev.txHash.slice(0, 8)}...{ev.txHash.slice(-6)}
                          </div>
                        )}
                        {ev.ts && (
                          <span className="text-[10px] text-app-muted-text/30 font-medium">{TIME_AGO(ev.ts)}</span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-app-accent/10 backdrop-blur-sm">
                          <span className="text-[10px] text-app-accent font-bold">↗</span>
                        </div>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </motion.div>
          )}

          {events.length > 0 && (
            <div className="mt-6 text-center">
              <a
                href={SEPOLIA_EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-[11px] font-bold text-app-muted-text uppercase tracking-[0.15em] border border-app-border/40 rounded-xl px-5 py-2.5 transition-all duration-300 hover:border-app-accent/30 hover:text-app-accent hover:bg-app-accent/[0.04] hover:shadow-lg hover:shadow-app-accent/5"
              >
                View All on Etherscan
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-xs">↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Setup Guide */}
        <div className="mt-16 max-w-lg mx-auto space-y-3">
          <p className="text-xs font-semibold text-app-muted-text text-center uppercase tracking-wider">
            New to MetaMask? Watch this setup guide
          </p>
          <div className="rounded-lg overflow-hidden border border-app-border/30">
            <iframe
              src="https://www.youtube.com/embed/u29lPmfJOEA"
              title="MetaMask Sepolia Mobile Setup"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full aspect-video"
            />
          </div>
          <div className="p-3 rounded-lg bg-app-surface/50 border border-app-border/30 text-xs space-y-2 text-app-muted-text">
            <p className="font-semibold text-app-heading">Sepolia is already in MetaMask &mdash; just unhide it:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs pl-1">
              <li>Open MetaMask app</li>
              <li>Tap the network selector at the top</li>
              <li>Tap the <strong className="text-app-heading">gear icon</strong> (Settings)</li>
              <li>Scroll down → <strong className="text-app-heading">Show test networks</strong> → toggle <strong className="text-app-heading">ON</strong></li>
              <li>Go back → tap <strong className="text-app-heading">Sepolia</strong></li>
            </ol>
          </div>
        </div>

      </div>

    </motion.div>
  );
}
