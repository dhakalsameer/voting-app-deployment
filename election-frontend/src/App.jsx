import { useContext, useState } from "react";
import { useBalance } from "./hooks/useBalance";
import { AuthContext } from "./context/AuthContextValue";
import { ToastProvider } from "./components/ui/Toast";
import { API_URL, CONTRACT_ADDRESS_V3, SEPOLIA_NETWORK, SEPOLIA_CHAIN_ID } from "./config";
import AppHeader from "./components/ui/AppHeader";
import AdminDashboard from "./components/admin/AdminDashboard";
import VotingPanelV3 from "./components/VotingPanelV3";
import Results from "./components/Results";
import LiveBlockchainDashboard from "./components/LiveBlockchainDashboard";
import WalletButton from "./components/WalletButton";
import SystemStatus from "./components/SystemStatus";
import ArchitectureOverview from "./components/ArchitectureOverview";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import StudentPortal from "./components/StudentPortal";
import ScrollToTop from "./components/ui/ScrollToTop";


function StatusBanner({ variant = "amber", icon, title, children }) {
  const styles = {
    amber: {
      wrap: "bg-amber-950/20 border-amber-500/30",
      icon: "bg-amber-500/10 border-amber-500/20",
      title: "text-amber-400",
      text: "text-amber-300/80",
    },
    emerald: {
      wrap: "bg-sky-950/25 border-sky-400/25",
      icon: "bg-sky-400/10 border-sky-400/25",
      title: "text-sky-300",
      text: "text-sky-200/80",
    },
    rose: {
      wrap: "bg-rose-950/20 border-rose-500/30",
      icon: "bg-rose-500/10 border-rose-500/20",
      title: "text-rose-400",
      text: "text-rose-300/80",
    },
  };
  const s = styles[variant];

  return (
    <div className={`status-banner shadow-md animate-fade-in ${s.wrap}`}>
      <div className={`shrink-0 rounded-xl border p-2.5 sm:p-3 text-xl sm:text-2xl ${s.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className={`text-base sm:text-lg font-black uppercase tracking-wide ${s.title}`}>
          {title}
        </h2>
        <p className={`text-sm mt-1 leading-relaxed ${s.text}`}>{children}</p>
      </div>
    </div>
  );
}

function App() {
  const { wallet, isAdmin, voterStatus } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const [portalOpen, setPortalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const hasLowGas = balance !== null && Number(balance) < 0.001;

  const currentTab = activeTab || (isAdmin ? "admin" : "vote");

  return (
    <ToastProvider>
      <div className="app-shell font-sans">
        <SystemStatus />

        <AppHeader
          onOpenPortal={() => setPortalOpen(true)}
          activeTab={currentTab}
          setActiveTab={setActiveTab}
        />

        <main className="page-container py-6 sm:py-10 lg:py-14">
          {!wallet ? (
            <div className="mx-auto max-w-2xl animate-fade-in">
              <div className="glass-panel relative overflow-hidden rounded-2xl sm:rounded-3xl border border-app p-6 sm:p-10 text-center shadow-card">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-emerald-400 to-sky-400" />
                <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] [background-size:28px_28px] text-sky-300" />

                <div className="relative mx-auto mb-6 sm:mb-8 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 shadow-neon-glow animate-float">
                  <span className="text-4xl sm:text-5xl" aria-hidden="true">🗳️</span>
                </div>

                <h2 className="relative text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4 gradient-text-emerald uppercase tracking-tight">
                  Ready to cast your vote?
                </h2>
                <p className="relative text-app-body mb-8 sm:mb-10 text-base sm:text-lg leading-relaxed max-w-md mx-auto px-2">
                  Connect your Ethereum wallet to securely access the student portal.
                  Only verified members of the IT Club can participate in active campus elections.
                </p>

                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
                  <WalletButton />
                  <button
                    onClick={() => setPortalOpen(true)}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Open Student Portal
                  </button>
                </div>

                <div className="relative mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 px-3.5 py-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-sky-300 shadow-neon-glow animate-pulse-glow">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  {SEPOLIA_NETWORK} · Chain {SEPOLIA_CHAIN_ID}
                  <span className="hidden sm:inline text-app-muted">
                    · {CONTRACT_ADDRESS_V3.slice(0, 8)}...{CONTRACT_ADDRESS_V3.slice(-6)}
                  </span>
                </div>

                <div className="relative mt-2 text-xs text-app-muted uppercase tracking-wider">
                  Connect MetaMask on Sepolia to interact with the smart contract
                </div>

                <div className="relative mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {[
                    { icon: "🛡️", label: "Merkle verified", desc: "Cryptographic voter whitelist" },
                    { icon: "🔗", label: "On-chain", desc: "Immutable Sepolia ledger" },
                    { icon: "⚡", label: "Live sync", desc: "Real-time result updates" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-app bg-app-muted/70 p-3 sm:p-4"
                    >
                      <span className="text-lg" aria-hidden="true">{item.icon}</span>
                      <p className="mt-1 text-sm font-bold text-app-heading">{item.label}</p>
                      <p className="text-xs sm:text-sm text-app-muted mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tab: Vote / Admin Console */}
              {(currentTab === "vote" || currentTab === "admin") && (
                <div className="mx-auto max-w-3xl section-gap animate-fade-in">
                  {isAdmin && <AdminDashboard />}

                  {!isAdmin && (
                    <>
                      {!voterStatus.registered && (
                        <StatusBanner variant="amber" icon="⚠️" title="Account Synchronization Required">
                          Your wallet is not linked to our student database. Please visit the student portal to verify your identity.
                        </StatusBanner>
                      )}

                      {voterStatus.registered && !voterStatus.walletLinked && (
                        <StatusBanner variant="amber" icon="⏳" title="Verification in Progress">
                          Your wallet link is pending approval. The admin team is currently reviewing your student credentials.
                        </StatusBanner>
                      )}

                      {voterStatus.registered && voterStatus.walletLinked && !voterStatus.verified && (
                        <StatusBanner variant="emerald" icon="🛡️" title="Electorate Whitelist Pending">
                          Identity verified. You will be added to the Merkle Tree whitelist once the registration phase concludes.
                        </StatusBanner>
                      )}

                      {hasLowGas && (
                        <StatusBanner variant="rose" icon="⛽" title="Low Sepolia ETH">
                          Your wallet has {Number(balance).toFixed(4)} ETH — not enough gas to cast a vote. Contact the admin to receive Sepolia test ETH.
                        </StatusBanner>
                      )}

                      {voterStatus.canVote && <VotingPanelV3 />}

                      {voterStatus.hasVoted && (
                        <div className="status-banner bg-sky-950/25 border-2 border-sky-400/30 rounded-2xl sm:rounded-3xl shadow-neon-glow animate-fade-in flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-6 sm:p-8">
                          <div className="shrink-0 rounded-2xl border border-sky-300/30 bg-sky-400/15 p-3 sm:p-4 text-2xl sm:text-3xl shadow-sm animate-float self-start">
                            ✅
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-black text-sky-300 uppercase tracking-tight">
                              Blockchain Record Confirmed
                            </h2>
                            <p className="text-app-body text-base mt-1 leading-relaxed">
                              Your vote has been permanently etched into the Sepolia ledger. Your contribution to IT Club&apos;s digital democracy is complete.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab: Results */}
              {currentTab === "results" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 animate-fade-in">
                  <div className="lg:col-span-5 section-gap">
                    <Results />
                  </div>
                  <div className="lg:col-span-7 section-gap">
                    <AnalyticsDashboard />
                  </div>
                </div>
              )}

              {/* Tab: Live Activity */}
              {currentTab === "activity" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 animate-fade-in">
                  <div className="lg:col-span-8 section-gap">
                    <LiveBlockchainDashboard />
                  </div>
                  <div className="lg:col-span-4 section-gap">
                    <div className="glass-panel relative overflow-hidden rounded-2xl border border-app p-5 sm:p-6 shadow-card group">
                      <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-5 transition-transform group-hover:scale-110">
                        <span className="text-5xl sm:text-6xl text-sky-300" aria-hidden="true">🔒</span>
                      </div>
                      <h3 className="font-bold text-sm text-app-heading uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span className="h-2 w-2 bg-sky-400 rounded-full animate-pulse-glow" />
                        Security Notice
                      </h3>
                      <p className="text-xs text-app-body leading-relaxed mb-4">
                        This system uses end-to-end cryptographic verification. No central authority can alter your vote.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("docs");
                        }}
                        className="text-sm font-black uppercase tracking-wider text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
                      >
                        Learn about Merkle Proofs →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: How It Works */}
              {currentTab === "docs" && (
                <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
                  <ArchitectureOverview />
                  <div className="glass-panel relative overflow-hidden rounded-2xl border border-app p-6 shadow-card">
                    <h3 className="font-bold text-sm text-app-heading uppercase tracking-wider flex items-center gap-2 mb-4">
                      🛡️ Verifiable Cryptographic Security
                    </h3>
                    <p className="text-xs text-app-body leading-relaxed mb-3">
                      Every transaction on the Sepolia Testnet is immutable and globally auditable. The student database is linked to the smart contract using a cryptographic data structure called a <strong>Merkle Tree</strong>.
                    </p>
                    <p className="text-xs text-app-body leading-relaxed">
                      When you vote, the system generates a personalized <strong>Merkle Proof</strong> proving your identity is included in the registered root. This proof is sent to the smart contract, which verifies it instantly on-chain without storing your personal details, guaranteeing complete voter privacy.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="page-container py-8 sm:py-12 border-t border-app mt-8 sm:mt-12 safe-bottom">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
              <span className="font-bold text-sm uppercase tracking-tighter text-app-muted">Powered by</span>
              <span className="font-black text-sm italic text-sky-300">Ethereum + Sepolia</span>
            </div>
            <p className="text-xs font-bold text-app-muted uppercase tracking-[0.15em] sm:tracking-[0.2em] max-w-xs sm:max-w-none">
              © 2026 IT Club Decentralized Governance Platform
            </p>
          </div>
        </footer>

        <StudentPortal open={portalOpen} onClose={() => setPortalOpen(false)} />
        <ScrollToTop />
      </div>
    </ToastProvider>
  );
}

export default App;
