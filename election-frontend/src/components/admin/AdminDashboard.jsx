import { useState, useContext } from "react";
import ElectionControl from "./ElectionControl";
import VerifyVoter from "./VerifyVoter";
import GenerateCodes from "./GenerateCodes";
import StudentList from "./StudentList";
import GasDistribution from "./GasDistribution";
import PendingCandidates from "./PendingCandidates";
import { AuthContext } from "../../context/AuthContextValue";
import { useBalance } from "../../hooks/useBalance";
import { CONTRACT_ADDRESS_V3, SEPOLIA_CHAIN_ID, SEPOLIA_NETWORK, SEPOLIA_EXPLORER } from "../../config";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("controls");
  const { wallet } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const contractLabel = `${CONTRACT_ADDRESS_V3.slice(0, 8)}...${CONTRACT_ADDRESS_V3.slice(-6)}`;

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-card border border-app relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-wider text-app-heading uppercase">
            Admin Console
          </h2>
          <p className="text-sm font-medium text-app-body mt-1">
            Manage system lifecycle, candidate whitelists, and cryptographic voter verification
          </p>
        </div>
        <div className="self-start sm:self-center flex flex-wrap items-center gap-2">
          {balance && (
            <div
              className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-amber-200"
              title="Admin Sepolia ETH balance"
            >
              <span className="text-xs">Ξ</span>
              <span>{Number(balance).toFixed(4)} ETH</span>
            </div>
          )}
          <a
            href={`${SEPOLIA_EXPLORER}/address/${CONTRACT_ADDRESS_V3}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-sky-300 hover:border-sky-300/45 hover:text-sky-200 transition-colors"
            title={`Contract ${CONTRACT_ADDRESS_V3}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            {SEPOLIA_NETWORK} · {SEPOLIA_CHAIN_ID}
            <span className="hidden lg:inline text-app-muted">{contractLabel}</span>
          </a>
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest text-glow-rose">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> Elevated Access
          </div>
        </div>
      </div>

      {balance !== null && Number(balance) < 0.05 && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 animate-pulse">
          <span className="text-lg">⛽</span>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-rose-400">
              Low Admin Balance — {Number(balance).toFixed(4)} ETH Remaining
            </p>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Get more Sepolia ETH from a faucet before distributing to voters.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tab-scroll mb-6 sm:mb-8 border-b border-app pb-4 sm:pb-5">
        {[
          { id: "controls", label: "⚙️ System Controls" },
          { id: "voters", label: "👥 Voter Registry" },
          { id: "pending", label: "📋 Pending Candidates" },
          { id: "gas", label: "⛽ Gas Distribution" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-emerald-500 text-slate-950 shadow-neon-glow"
                : "border border-app bg-app-input text-app-muted hover:text-app-heading hover:bg-app-elevated"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Panels */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "controls" && (
          <div className="p-4 sm:p-6 bg-app-elevated/45 border border-app rounded-2xl">
            <ElectionControl />
          </div>
        )}

        {activeTab === "voters" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="p-4 sm:p-6 bg-app-elevated/45 border border-app rounded-2xl">
              <VerifyVoter />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-6 bg-app-elevated/45 border border-app rounded-2xl">
                <GenerateCodes />
              </div>
              <div className="p-4 sm:p-6 bg-app-elevated/45 border border-app rounded-2xl">
                <StudentList />
              </div>
            </div>
          </div>
        )}

        {activeTab === "pending" && (
          <div className="p-4 sm:p-6 bg-app-elevated/45 border border-app rounded-2xl">
            <PendingCandidates />
          </div>
        )}

        {activeTab === "gas" && (
          <div className="p-4 sm:p-6 bg-app-elevated/45 border border-app rounded-2xl">
            <GasDistribution />
          </div>
        )}
      </div>
    </div>
  );
}
