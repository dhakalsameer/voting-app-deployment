import { useContext, useState, useEffect, useRef, lazy, Suspense } from "react";
import { JsonRpcProvider } from "ethers";
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

function TxModal({ block, txs, loading, onClose }) {
  if (!block) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-app-border bg-app-surface-solid p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-app-heading font-mono">Block #{typeof block === 'object' ? block.number.toLocaleString() : block.toLocaleString()}</h3>
            {typeof block === 'object' && (
              <p className="text-xs text-app-muted-text/70 mt-0.5">
                {block.txCount} {block.txCount === 1 ? 'txn' : 'txns'} · {block.events} contract events · {TIME_AGO(block.timestamp)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-app-muted-text hover:text-app-heading transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-app-accent border-t-transparent" />
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-app-muted-text text-sm">No contract events in this block</p>
            <a href={`${SEPOLIA_EXPLORER}/block/${typeof block === 'object' ? block.number : block}`} target="_blank" rel="noopener noreferrer" className="text-app-accent text-xs hover:underline mt-1 inline-block">
              View on Etherscan ↗
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((ev, i) => {
              const meta = EVENT_LABELS[ev.eventName] || { icon: "🔗", label: ev.eventName };
              return (
                <a
                  key={ev.txHash + (ev.logIndex || i)}
                  href={`${SEPOLIA_EXPLORER}/tx/${ev.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface/60 p-3 transition-all duration-200 hover:bg-app-surface-solid/60"
                >
                  <span className="text-base shrink-0">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-app-heading">{meta.label}</p>
                    <p className="text-[10px] text-app-muted-text font-mono truncate mt-0.5">
                      {ev.txHash.slice(0, 8)}...{ev.txHash.slice(-6)}
                    </p>
                  </div>
                  <span className="text-[10px] text-app-accent shrink-0">↗</span>
                </a>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-center">
          <a href={`${SEPOLIA_EXPLORER}/block/${typeof block === 'object' ? block.number : block}`} target="_blank" rel="noopener noreferrer" className="text-xs text-app-accent hover:underline">
            View full block on Etherscan ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ onOpenPortal }) {
  const [blocks, setBlocks] = useState([]);
  const [events, setEvents] = useState([]);
  const [blockEvents, setBlockEvents] = useState({});
  const [modalBlock, setModalBlock] = useState(null);
  const [modalTxs, setModalTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const providerRef = useRef(null);
  const lastBlockRef = useRef(0);
  const lastEventBlockRef = useRef(0);

  if (!providerRef.current) {
    providerRef.current = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  }

  useEffect(() => {
    const provider = providerRef.current;
    let mounted = true;
    let pollCount = 0;

    const poll = async () => {
      try {
        pollCount++;
        const currentBlock = await provider.getBlockNumber();
        if (!mounted) return;

        // --- Blocks (latest 8, only when new block appears) ---
        if (currentBlock !== lastBlockRef.current) {
          lastBlockRef.current = currentBlock;
          const startBlock = Math.max(0, currentBlock - 7);
          const promises = [];
          for (let i = startBlock; i <= currentBlock; i++) promises.push(provider.getBlock(i));
          const fetched = await Promise.all(promises);
          if (!mounted) return;
          setBlocks(fetched.filter(Boolean).reverse().map(b => ({
            number: b.number, hash: b.hash,
            timestamp: Number(b.timestamp), txCount: b.transactions.length, miner: b.miner,
          })));
        }

        // --- Events from backend API (every 4th poll ~60s, always on first) ---
        if (pollCount === 1 || pollCount % 4 === 0) {
          const res = await fetch(`${API_URL}/api/events?limit=20`);
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            const mapped = (data || []).map(e => ({
              eventName: e.eventName,
              blockNumber: e.blockNumber,
              txHash: e.txHash,
              ts: Date.now(),
              icon: (EVENT_LABELS[e.eventName] || {}).icon || "🔗",
              label: (EVENT_LABELS[e.eventName] || {}).label || e.eventName,
              args: e.args || {},
            }));
            if (mounted) {
              setEvents(mapped.slice(0, 8));

              // Group by block for block card icons
              const byBlock = {};
              for (const ev of mapped) {
                const meta = EVENT_LABELS[ev.eventName] || { icon: "🔗", label: ev.eventName };
                if (!byBlock[ev.blockNumber]) byBlock[ev.blockNumber] = [];
                if (byBlock[ev.blockNumber].length < 3) byBlock[ev.blockNumber].push(meta);
              }
              setBlockEvents(byBlock);
            }
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

  const openBlock = async (num) => {
    setModalBlock(num);
    setTxLoading(true);
    setModalTxs([]);
    try {
      const contract = contractRef.current;
      const provider = providerRef.current;
      const logs = await contract.queryFilter("*", num, num);
      const block = await provider.getBlock(num);
      const mapped = logs
        .filter(log => EVENT_LABELS[log.fragment?.name])
        .map(log => ({
          eventName: log.fragment.name,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          logIndex: log.index,
          args: log.args,
        }));
      setModalTxs(mapped);
      setModalBlock({ number: num, timestamp: Number(block?.timestamp) || 0, txCount: block?.transactions.length || 0, events: mapped.length });
    } catch { /* ignore */ }
    setTxLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden"
    >
      <div className="relative max-w-4xl px-4">
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
          <button onClick={onOpenPortal} className="btn-secondary text-base px-5 py-2.5 gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Student Portal
          </button>
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

        <div className="mt-10 text-center">
          <h3 className="text-sm font-semibold text-app-muted-text uppercase tracking-wider mb-4">Latest Blocks</h3>
          {blocks.length === 0 ? (
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-app-muted-text" />
              <span className="text-sm text-app-muted-text">Fetching latest blocks...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {blocks.map((b, i) => {
                const isFirst = i === 0;
                return (
                  <button
                    key={b.hash}
                    onClick={() => openBlock(b.number)}
                    className={`group relative flex flex-col items-center rounded-xl border px-3 py-3 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer w-full ${
                      isFirst
                        ? 'border-app-accent/40 bg-app-accent-soft'
                        : 'border-app-border bg-app-surface-solid/40'
                    }`}
                  >
                    {isFirst && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-trust opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-app-trust" />
                      </span>
                    )}
                    <span className="text-xs text-app-heading font-mono font-medium mb-0.5">
                      #{b.number.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-app-muted-text/70 font-mono">{TIME_AGO(b.timestamp)}</span>
                    <span className="text-[10px] text-app-muted-text mt-0.5">
                      {b.txCount} {b.txCount === 1 ? 'txn' : 'txns'}
                    </span>
                    {blockEvents[b.number] && blockEvents[b.number].length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {blockEvents[b.number].map((m, j) => (
                          <span key={j} className="text-[10px]" title={m.label}>{m.icon}</span>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-app-accent/70 group-hover:text-app-accent mt-0.5 transition-colors">
                      View details →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h3 className="text-sm font-semibold text-app-muted-text uppercase tracking-wider mb-4 text-center">Recent On-Chain Activity</h3>
          {events.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm text-app-muted-text">
              <span className="h-2 w-2 animate-pulse rounded-full bg-app-muted-text" />
              <span>Listening for contract events...</span>
            </div>
          ) : (<>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {events.slice(0, 8).map((ev) => (
                <a
                  key={ev.txHash}
                  href={`${SEPOLIA_EXPLORER}/tx/${ev.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-app-border bg-app-surface-solid/30 p-3 transition-all duration-200 hover:bg-app-surface-solid/60 hover:shadow-md"
                >
                  <span className="mt-0.5 text-lg shrink-0">{ev.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-app-heading">{ev.label}</span>
                      <span className="text-[10px] text-app-muted-text font-mono">#{ev.blockNumber.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-app-muted-text font-mono">
                      <span className="truncate max-w-[160px]">{ev.txHash.slice(0, 14)}...{ev.txHash.slice(-6)}</span>
                      <span className="shrink-0">· {TIME_AGO(ev.ts / 1000)}</span>
                    </div>
                    {ev.args && Object.keys(ev.args).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(ev.args).slice(0, 3).map(([k, v]) => {
                          const val = typeof v === 'string' && v.startsWith('0x')
                            ? `${v.slice(0, 6)}...${v.slice(-4)}`
                            : String(v);
                          return (
                            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-app-surface border border-app-border/50 text-app-muted-text">
                              {k}: {val}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-app-accent/50 group-hover:text-app-accent shrink-0 transition-colors">↗</span>
                </a>
              ))}
            </div>
            <div className="mt-4 text-center">
              <a
                href={SEPOLIA_EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-app-accent hover:underline"
              >
                View all on Etherscan ↗
              </a>
            </div>
          </>)}
        </div>

      </div>

      <TxModal block={modalBlock} txs={modalTxs} loading={txLoading} onClose={() => setModalBlock(null)} />
    </motion.div>
  );
}

export default App;
