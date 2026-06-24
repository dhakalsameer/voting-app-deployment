import { useContext, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBalance } from "./hooks/useBalance";
import { AuthContext } from "./context/AuthContextValue";
import { ToastProvider } from "./components/ui/Toast";
import { CONTRACT_ADDRESS_V3, SEPOLIA_NETWORK, SEPOLIA_CHAIN_ID } from "./config";
import AppHeader from "./components/ui/AppHeader";
import AdminDashboard from "./components/admin/AdminDashboard";
import VotingPanelV3 from "./components/VotingPanelV3";
import Results from "./components/Results";
import LiveBlockchainDashboard from "./components/LiveBlockchainDashboard";
import WalletButton from "./components/WalletButton";
import ArchitectureOverview from "./components/ArchitectureOverview";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import VoterStatusCard from "./components/VoterStatusCard";
import MainRegistrationBanner from "./components/MainRegistrationBanner";
import StudentPortal from "./components/StudentPortal";
import ScrollToTop from "./components/ui/ScrollToTop";


const TAB_ORDER = ["vote", "results", "activity", "docs"];

const pageVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

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

  const currentTab = activeTab || (isAdmin ? "admin" : "vote");

  return (
    <ToastProvider>
      <div className="app-shell font-sans">
        <AppHeader
          onOpenPortal={() => setPortalOpen(true)}
          activeTab={currentTab}
          setActiveTab={setActiveTab}
        />

        <main className="page-container py-8">
          {!wallet ? (
            <LandingPage onOpenPortal={() => setPortalOpen(true)} />
          ) : (
            <div className="mx-auto max-w-3xl">
              <AnimatePresence mode="wait">
                {currentTab === "vote" && !isAdmin && (
                  <AnimatedPage key="vote">
                    <div className="space-y-4">
                      <VoterStatusCard voterStatus={voterStatus} balance={balance} />
                      <MainRegistrationBanner />
                      {voterStatus.canVote && <VotingPanelV3 />}
                      {voterStatus.hasVoted && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-xl">✓</span>
                          </div>
                          <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-wide">Vote Recorded</h2>
                        </div>
                      )}
                    </div>
                  </AnimatedPage>
                )}

                {(currentTab === "vote" || currentTab === "admin") && isAdmin && (
                  <AnimatedPage key="admin">
                    <AdminDashboard />
                  </AnimatedPage>
                )}

                {currentTab === "results" && (
                  <AnimatedPage key="results">
                    {isAdmin ? <AnalyticsDashboard /> : <Results />}
                  </AnimatedPage>
                )}

                {currentTab === "activity" && (
                  <AnimatedPage key="activity">
                    <LiveBlockchainDashboard />
                  </AnimatedPage>
                )}

                {currentTab === "docs" && (
                  <AnimatedPage key="docs" className="max-w-3xl mx-auto">
                    <ArchitectureOverview />
                  </AnimatedPage>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      <StudentPortal open={portalOpen} onClose={() => setPortalOpen(false)} />
      <ScrollToTop />
    </ToastProvider>
  );
}

function VoteIcon() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <defs>
        <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Ballot box */}
      <rect x="12" y="30" width="56" height="38" rx="6" fill="none" stroke="url(#vg)" strokeWidth="2.5" />
      <rect x="16" y="34" width="48" height="4" rx="1.5" fill="url(#vg)" opacity="0.3" />
      {/* Slot */}
      <rect x="30" y="22" width="20" height="10" rx="3" fill="none" stroke="url(#vg)" strokeWidth="2" />
      {/* Checkmark */}
      <path d="M52 46l-12 12-8-8" fill="none" stroke="url(#vg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Small star accent */}
      <path d="M68 12l-2 4-4 .5 3 3-.5 4 3.5-2 3.5 2-.5-4 3-3-4-.5z" fill="#fbbf24" opacity="0.8" />
    </svg>
  );
}

function LandingPage({ onOpenPortal }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-[70vh] items-center justify-center"
    >
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6">
          <VoteIcon />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-app-heading mb-2">
          Club Election
        </h1>
        <p className="text-sm text-app-muted-text mb-8">Decentralized voting on Sepolia</p>

        <div className="flex flex-col items-center gap-3">
          <WalletButton />
          <button onClick={onOpenPortal} className="btn-secondary">
            Student Portal
          </button>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/5 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <span className="text-sm font-mono text-sky-300">{SEPOLIA_NETWORK}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default App;
