import { useContext, useState, useEffect, useRef, lazy, Suspense } from "react";
import { JsonRpcProvider, Contract } from "ethers";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "./hooks/useBalance";
import { AuthContext } from "./context/AuthContextValue";
import { ToastProvider } from "./components/ui/Toast";
import { CONTRACT_ADDRESS_V3, SEPOLIA_EXPLORER } from "./config";
import Election3ABI from "./abi/Election3.json";
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

const EVENT_LABELS = {
  VoteCast:            { icon: "🗳️", label: "Vote Cast" },
  BallotCast:          { icon: "📜", label: "Ballot Cast" },
  CandidateRegistered: { icon: "👤", label: "Candidate Registered" },
  PhaseChanged:        { icon: "🔄", label: "Phase Changed" },
  NewElectionStarted:  { icon: "🗳️", label: "New Election" },
};

const INITIAL_SCAN_DEPTH = 50000;

function LandingPage({ onOpenPortal }) {
  const [events, setEvents] = useState([]);
  const [initialBlock, setInitialBlock] = useState(null);
  const providerRef = useRef(null);
  const contractRef = useRef(null);
  const lastBlockRef = useRef(0);
  const initialScanDone = useRef(false);

  if (!providerRef.current) {
    providerRef.current = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
    contractRef.current = new Contract(CONTRACT_ADDRESS_V3, Election3ABI.abi, providerRef.current);
  }

  useEffect(() => {
    const contract = contractRef.current;
    const provider = providerRef.current;
    let mounted = true;

    const poll = async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        if (!mounted) return;

        const isInitialScan = !initialScanDone.current;

        if (isInitialScan) {
          initialScanDone.current = true;
          const fromBlock = Math.max(0, currentBlock - INITIAL_SCAN_DEPTH);
          const logs = await contract.queryFilter("*", fromBlock, currentBlock);
          if (!mounted) return;
          const parsed = logs
            .filter(log => EVENT_LABELS[log.fragment?.name])
            .reverse()
            .slice(0, 5)
            .map(log => ({
              eventName: log.fragment.name,
              blockNumber: log.blockNumber,
              txHash: log.transactionHash,
              ts: Date.now(),
            }));
          if (parsed.length > 0) {
            setEvents(parsed);
          } else {
            const block = await provider.getBlock(currentBlock);
            if (block && mounted) {
              setInitialBlock({ num: block.number, hash: block.hash, txs: block.transactions.length });
            }
          }
          lastBlockRef.current = currentBlock;
          return;
        }

        if (currentBlock <= lastBlockRef.current) return;
        const fromBlock = lastBlockRef.current + 1;
        lastBlockRef.current = currentBlock;

        const logs = await contract.queryFilter("*", fromBlock, currentBlock);
        if (!mounted) return;

        const parsed = logs
          .filter(log => EVENT_LABELS[log.fragment?.name])
          .reverse()
          .slice(0, 3)
          .map(log => ({
            eventName: log.fragment.name,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            ts: Date.now(),
          }));

        if (parsed.length > 0) {
          setEvents(prev => {
            const seen = new Set(prev.map(e => e.txHash));
            const merged = [...parsed.filter(e => !seen.has(e.txHash)), ...prev];
            return merged.slice(0, 5);
          });
        }
      } catch { /* ignore */ }
    };

    poll();
    const interval = setInterval(poll, 12000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden"
    >
      <div className="relative max-w-2xl px-4">
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

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          {events.length === 0 && !initialBlock && (
            <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface-solid/40 px-4 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-app-muted-text" />
              <span className="text-sm text-app-muted-text">Scanning for on-chain activity...</span>
            </div>
          )}
          {events.length === 0 && initialBlock && (
            <a
              href={`${SEPOLIA_EXPLORER}/block/${initialBlock.num}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center rounded-xl border border-app-border bg-app-surface-solid/40 px-4 py-3 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center gap-1.5 text-xs text-app-heading font-mono font-medium mb-1">
                <span>🔗</span> Latest Block
              </div>
              <div className="text-xs text-app-muted-text font-mono">
                #{initialBlock.num.toLocaleString()}
              </div>
              <div className="text-[10px] text-app-muted-text">{initialBlock.txs} txns</div>
              <div className="text-[10px] text-app-accent mt-0.5 underline underline-offset-2">
                View on Etherscan ↗
              </div>
            </a>
          )}
          {events.map((ev, i) => {
            const meta = EVENT_LABELS[ev.eventName] || { icon: "🔗", label: ev.eventName };
            return (
              <a
                key={ev.txHash}
                href={`${SEPOLIA_EXPLORER}/tx/${ev.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center rounded-xl border px-4 py-3 text-center transition-all duration-500 hover:scale-105 hover:shadow-lg ${
                  i === 0
                    ? 'border-app-accent/40 bg-app-accent-soft'
                    : 'border-app-border bg-app-surface-solid/40'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-app-heading font-mono font-medium mb-1">
                  {i === 0 && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-app-trust opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-app-trust" />
                    </span>
                  )}
                  <span>{meta.icon}</span> {meta.label}
                </div>
                <div className="text-xs text-app-muted-text font-mono">
                  Block #{ev.blockNumber.toLocaleString()}
                </div>
                <div className="text-[10px] text-app-accent mt-0.5 underline underline-offset-2">
                  View on Etherscan ↗
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </motion.div>
  );
}

export default App;
