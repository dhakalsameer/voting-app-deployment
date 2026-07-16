import { useContext, useState, lazy, Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "./hooks/useBalance";
import { AuthContext } from "./context/AuthContextValue";
import { ToastProvider } from "./components/ui/Toast";
import AppHeader from "./components/ui/AppHeader";
import VoterStatusCard from "./components/VoterStatusCard";
import MainRegistrationBanner from "./components/MainRegistrationBanner";
import ScrollToTop from "./components/ui/ScrollToTop";
import Cube3D from "./components/ui/Cube3D";
import LandingPage from "./components/LandingPage";
import WinnerBanner from "./components/WinnerBanner";

const VotingPanelV3 = lazy(() => import("./components/VotingPanelV3"));
const LiveStatsSidebar = lazy(() => import("./components/LiveStatsSidebar"));
const Results = lazy(() => import("./components/Results"));
const LiveBlockchainDashboard = lazy(() => import("./components/LiveBlockchainDashboard"));
const VoterGuide = lazy(() => import("./components/VoterGuide"));
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
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    return hash || null;
  });
  useEffect(() => {
    window.location.hash = activeTab || "";
  }, [activeTab]);
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      setActiveTab(hash || null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [docsSubTab, setDocsSubTab] = useState("guide");


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
                  <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6 items-start">
                    <div className="order-2 lg:order-1 space-y-3 lg:sticky lg:top-4 lg:self-start">
                      <Suspense fallback={null}>
                        <LiveStatsSidebar />
                      </Suspense>
                    </div>
                    <div className="order-1 lg:order-2 space-y-4 min-w-0">
                      <WinnerBanner />
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

              {currentTab === "results" && !isAdmin && (
                <AnimatedPage key="results">
                  <div className="space-y-4">
                    <WinnerBanner />
                    <Suspense fallback={<LoadingSection />}>
                      <Results />
                    </Suspense>
                  </div>
                </AnimatedPage>
              )}
              {currentTab === "results" && isAdmin && (
                <AnimatedPage key="results">
                  <Suspense fallback={<LoadingSection />}>
                    <AnalyticsDashboard />
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 max-w-3xl mx-auto">
                      <button
                        onClick={() => setDocsSubTab("guide")}
                        className={`text-sm font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                          docsSubTab === "guide"
                            ? "bg-app-accent-soft text-app-accent border-app-accent-border"
                            : "bg-app-surface text-app-muted-text border-app-border hover:border-app-accent/30 hover:text-app-heading"
                        }`}
                      >
                        🗳️ Voter Guide
                      </button>
                      <button
                        onClick={() => setDocsSubTab("architecture")}
                        className={`text-sm font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                          docsSubTab === "architecture"
                            ? "bg-app-accent-soft text-app-accent border-app-accent-border"
                            : "bg-app-surface text-app-muted-text border-app-border hover:border-app-accent/30 hover:text-app-heading"
                        }`}
                      >
                        ⚙️ Architecture
                      </button>
                    </div>
                    <Suspense fallback={<LoadingSection />}>
                      {docsSubTab === "guide" ? <VoterGuide /> : <ArchitectureOverview />}
                    </Suspense>
                  </div>
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

export default App;
