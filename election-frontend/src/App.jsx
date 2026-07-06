import { useContext, useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "./hooks/useBalance";
import { AuthContext } from "./context/AuthContextValue";
import { ToastProvider } from "./components/ui/Toast";
import { SEPOLIA_EXPLORER, API_URL } from "./config";
import AppHeader from "./components/ui/AppHeader";
import WalletButton from "./components/WalletButton";
import VoterStatusCard from "./components/VoterStatusCard";
import MainRegistrationBanner from "./components/MainRegistrationBanner";
import ScrollToTop from "./components/ui/ScrollToTop";

const VotingPanelV3 = lazy(() => import("./components/VotingPanelV3"));
const LiveStatsSidebar = lazy(() => import("./components/LiveStatsSidebar"));
const Results = lazy(() => import("./components/Results"));
const LiveBlockchainDashboard = lazy(() => import("./components/LiveBlockchainDashboard"));
const ArchitectureOverview = lazy(() => import("./components/ArchitectureOverview"));
const AnalyticsDashboard = lazy(() => import("./components/AnalyticsDashboard"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const StudentPortal = lazy(() => import("./components/StudentPortal"));


const TAB_ORDER = ["vote", "results", "activity", "docs"];

const pageVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

function LoadingSection() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
    </div>
  );
}

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="enter"
      animate="center"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const { wallet, isAdmin, voterStatus } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const [portalOpen, setPortalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const currentTab = activeTab || (!wallet ? "home" : isAdmin ? "admin" : "vote");

  const networkNodes = [
    { x: 10, y: 20, color: 'var(--app-accent)' },
    { x: 25, y: 10, color: 'var(--app-heading)' },
    { x: 40, y: 25, color: 'var(--app-accent)' },
    { x: 55, y: 8, color: 'var(--app-heading)' },
    { x: 70, y: 18, color: 'var(--app-accent)' },
    { x: 85, y: 12, color: 'var(--app-heading)' },
    { x: 90, y: 30, color: 'var(--app-accent)' },
    { x: 15, y: 55, color: 'var(--app-heading)' },
    { x: 30, y: 70, color: 'var(--app-accent)' },
    { x: 50, y: 60, color: 'var(--app-accent)' },
    { x: 65, y: 75, color: 'var(--app-heading)' },
    { x: 80, y: 55, color: 'var(--app-accent)' },
    { x: 95, y: 70, color: 'var(--app-heading)' },
    { x: 5, y: 80, color: 'var(--app-accent)' },
    { x: 45, y: 85, color: 'var(--app-heading)' },
    { x: 75, y: 88, color: 'var(--app-accent)' },
  ];

  const connections = [
    [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [4, 5], [4, 6],
    [5, 6], [7, 8], [7, 9], [8, 9], [9, 10], [9, 11], [10, 11],
    [11, 12], [13, 7], [13, 14], [7, 14], [9, 14], [9, 15], [14, 15],
    [0, 7], [2, 9], [4, 11], [6, 12],
  ];

  const Cube3D = ({ x, y, size, color, opacity }) => {
    const s = size || 4;
    const h = s * 0.866;
    const top = `0,${-s} ${h},${-s * 0.5} 0,0 ${-h},${-s * 0.5}`;
    const left = `${-h},${-s * 0.5} 0,0 0,${s} ${-h},${s * 0.5}`;
    const right = `0,0 ${h},${-s * 0.5} ${h},${s * 0.5} 0,${s}`;
    return (
      <g transform={`translate(${x}, ${y})`}>
        <polygon points={top} fill={color} opacity={opacity * 0.25} />
        <polygon points={left} fill={color} opacity={opacity * 0.45} />
        <polygon points={right} fill={color} opacity={opacity * 0.65} />
      </g>
    );
  };

  return (
    <ToastProvider>
      <div className="app-shell font-sans">
        <AppHeader
          onOpenPortal={() => setPortalOpen(true)}
          activeTab={currentTab}
          setActiveTab={setActiveTab}
        />

        {/* persistent blockchain network background */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <svg
            className="h-full w-full opacity-35"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
          >
            <style>{`
              @keyframes pulseBlock {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.3); }
              }
            `}</style>

            {/* orbital cubes on both sides */}
            {[
              { cx: 3, cy: 15, r: 8, speed: 18, color: 'var(--app-accent)' },
              { cx: 3, cy: 85, r: 8, speed: 22, color: 'var(--app-accent)' },
              { cx: 97, cy: 15, r: 8, speed: 20, color: 'var(--app-accent)' },
              { cx: 97, cy: 85, r: 8, speed: 16, color: 'var(--app-accent)' },
            ].map((orbit, idx) => (
              <g key={`orbit-${idx}`} transform={`translate(${orbit.cx}, ${orbit.cy})`}>
                <circle cx="0" cy="0" r={orbit.r} fill="none" stroke={orbit.color} strokeWidth="0.15" opacity="0.15" />
                <g>
                  <animateMotion
                    dur={`${orbit.speed}s`}
                    repeatCount="indefinite"
                    path={`M0,${-orbit.r} A${orbit.r},${orbit.r} 0 1,1 0,${orbit.r} A${orbit.r},${orbit.r} 0 1,1 0,${-orbit.r}`}
                  />
                  <Cube3D x={0} y={0} size={3.5} color={orbit.color} opacity={0.6} />
                </g>
              </g>
            ))}

            {connections.map(([i, j], idx) => {
              const active = hoveredNode !== null && (i === hoveredNode || j === hoveredNode);
              return (
                <line
                  key={idx}
                  x1={networkNodes[i].x}
                  y1={networkNodes[i].y}
                  x2={networkNodes[j].x}
                  y2={networkNodes[j].y}
                  stroke={active ? 'var(--app-accent)' : 'var(--app-border)'}
                  strokeWidth={active ? '0.4' : '0.2'}
                  strokeDasharray={active ? '4 6' : 'none'}
                  opacity={active ? '0.7' : '0.4'}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s, opacity 0.3s' }}
                />
              );
            })}

            {/* transaction blocks moving along network lines */}
            {[
              { from: 0, to: 7, dur: 12, delay: 0, color: 'var(--app-accent)' },
              { from: 7, to: 0, dur: 12, delay: 6, color: 'var(--app-accent)' },
            ].map((tx, idx) => {
              const a = networkNodes[tx.from];
              const b = networkNodes[tx.to];
              return (
                <g key={`tx-${idx}`}>
                  <g>
                    <animateMotion
                      dur={`${tx.dur}s`}
                      repeatCount="indefinite"
                      begin={`${tx.delay}s`}
                      path={`M${a.x},${a.y} L${b.x},${b.y}`}
                    />
                    <Cube3D x={0} y={0} size={3.5} color={tx.color} opacity={0.7} />
                  </g>
                </g>
              );
            })}

            {networkNodes.map((node, idx) => {
              const active = hoveredNode === idx;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredNode(idx)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  style={{
                    transformOrigin: `${node.x} ${node.y}`,
                    animation: active ? `pulseBlock 1.5s ease-in-out infinite` : 'none',
                  }}
                >
                  <Cube3D x={node.x} y={node.y} size={5} color={node.color} opacity={active ? 0.8 : 0.5} />
                </g>
              );
            })}
          </svg>
        </div>

        <main className="relative z-10 page-container py-8">
          <div className={`mx-auto ${currentTab === "home" ? "max-w-3xl" : "max-w-6xl"}`}>
            <AnimatePresence mode="wait">
              {currentTab === "home" && (
                <AnimatedPage key="home">
                  <LandingPage onOpenPortal={() => setPortalOpen(true)} />
                </AnimatedPage>
              )}

              {currentTab === "vote" && !isAdmin && wallet && (
                <AnimatedPage key="vote">
                  <div className="lg:grid lg:grid-cols-[280px_1fr] gap-6 items-start">
                    <div className="hidden lg:block space-y-3">
                      <Suspense fallback={null}>
                        <LiveStatsSidebar />
                      </Suspense>
                    </div>
                    <div className="space-y-4 min-w-0">
                      <VoterStatusCard voterStatus={voterStatus} balance={balance} />
                      <MainRegistrationBanner />
                      <Suspense fallback={<LoadingSection />}>
                        <VotingPanelV3 />
                      </Suspense>
                    </div>
                  </div>
                </AnimatedPage>
              )}

              {(currentTab === "vote" || currentTab === "admin") && isAdmin && (
                <AnimatedPage key="admin">
                  <Suspense fallback={<LoadingSection />}>
                    <AdminDashboard />
                  </Suspense>
                </AnimatedPage>
              )}

              {currentTab === "results" && (
                <AnimatedPage key="results">
                  <Suspense fallback={<LoadingSection />}>
                    {isAdmin ? <AnalyticsDashboard /> : <Results />}
                  </Suspense>
                </AnimatedPage>
              )}

              {currentTab === "activity" && (
                <AnimatedPage key="activity">
                  <Suspense fallback={<LoadingSection />}>
                    <LiveBlockchainDashboard />
                  </Suspense>
                </AnimatedPage>
              )}

              {currentTab === "docs" && (
                <AnimatedPage key="docs">
                  <Suspense fallback={<LoadingSection />}>
                    <ArchitectureOverview />
                  </Suspense>
                </AnimatedPage>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <StudentPortal open={portalOpen} onClose={() => setPortalOpen(false)} />
      </Suspense>
      <ScrollToTop />
    </ToastProvider>
  );
}

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
  CandidateRegistered: { border: "border-sky-500/20",     bar: "bg-sky-500",        text: "text-sky-400",    glow: "shadow-sky-500/20",    from: "from-sky-500/10",    to: "to-sky-600/5" },
  PhaseChanged:        { border: "border-amber-500/20",   bar: "bg-amber-500",      text: "text-amber-400",  glow: "shadow-amber-500/20",  from: "from-amber-500/10",  to: "to-amber-600/5" },
  NewElectionStarted:  { border: "border-rose-500/20",    bar: "bg-rose-500",       text: "text-rose-400",   glow: "shadow-rose-500/20",   from: "from-rose-500/10",   to: "to-rose-600/5" },
};
const DEFAULT_CARD_COLORS = { border: "border-app-border", bar: "bg-app-accent", text: "text-app-accent", glow: "shadow-app-accent/20", from: "from-app-accent/10", to: "to-app-accent/5" };

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function LandingPage({ onOpenPortal }) {
  const { wallet } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let pollCount = 0;

    const poll = async () => {
      try {
        pollCount++;
        // Events from backend API (every ~60s, always on first)
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
        <p className="text-xl text-app-muted-text font-medium mb-10 text-center leading-relaxed max-w-md mx-auto">
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

        <div className="flex items-center justify-center gap-10 mt-12">
          <div className="flex items-center gap-3">
            <svg className="h-7 w-7 text-app-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-xl text-app-muted-text">Onchain</span>
          </div>
          <span className="text-app-muted-text/30 text-lg">|</span>
          <div className="flex items-center gap-3">
            <svg className="h-7 w-7 text-app-trust" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="text-xl text-app-muted-text">Transparent</span>
          </div>
          <span className="text-app-muted-text/30 text-lg">|</span>
          <div className="flex items-center gap-3">
            <svg className="h-7 w-7 text-app-ballot" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M9 12l2 2 4-4" />
              <path d="M4 9h16" />
            </svg>
            <span className="text-xl text-app-muted-text">Secure</span>
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
              {events.slice(0, 4).map((ev) => {
                const cc = EVENT_CARD_COLORS[ev.eventName] || DEFAULT_CARD_COLORS;
                return (
                  <motion.a
                    key={ev.txHash}
                    href={`${SEPOLIA_EXPLORER}/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={cardVariants}
                    className={`group relative flex flex-col rounded-2xl border ${cc.border} overflow-hidden transition-all duration-500 hover:scale-[1.04] hover:shadow-xl ${cc.glow} bg-app-surface/30 backdrop-blur-sm w-full`}
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

      </div>

    </motion.div>
  );
}

export default App;
