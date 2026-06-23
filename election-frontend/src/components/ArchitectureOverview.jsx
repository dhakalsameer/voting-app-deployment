export default function ArchitectureOverview() {
  return (
    <div id="architecture-overview" className="glass-panel p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-app shadow-card relative overflow-hidden">
      <h3 className="text-sm font-black text-sky-300 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="p-1 rounded bg-sky-400/10 text-sky-300">⚙️</span>
        System Architecture
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-3 bg-app-elevated/35 border border-app rounded-2xl p-5 hover:border-sky-400/35 transition-all duration-300">
          <div className="flex items-center gap-2 font-bold text-app-heading text-base">
            <span className="bg-sky-400/10 border border-sky-400/25 p-2 rounded-xl">🛡️</span>
            Merkle Tree Whitelist
          </div>
          <p className="text-sm text-app-body leading-relaxed">
            Eligible voters are verified off-chain via Merkle proofs. Only the Merkle root is stored on-chain, slashing transaction gas fees by 99% while maintaining absolute security.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 bg-app-elevated/35 border border-app rounded-2xl p-5 hover:border-sky-400/35 transition-all duration-300">
          <div className="flex items-center gap-2 font-bold text-app-heading text-base">
            <span className="bg-sky-400/10 border border-sky-400/25 p-2 rounded-xl">🔗</span>
            Blockchain Ledger
          </div>
          <p className="text-sm text-app-body leading-relaxed">
            Votes are permanently recorded on the Sepolia Testnet. Once broadcasted, a vote cannot be altered, censored, or double-counted by anyone—including system administrators.
          </p>
        </div>

        <div className="flex flex-col gap-3 bg-app-elevated/35 border border-app rounded-2xl p-5 hover:border-sky-400/35 transition-all duration-300">
          <div className="flex items-center gap-2 font-bold text-app-heading text-base">
            <span className="bg-sky-400/10 border border-sky-400/25 p-2 rounded-xl">⚡</span>
            Hybrid Sync Cache
          </div>
          <p className="text-sm text-app-body leading-relaxed">
            A background synchronization engine listens to smart contract events to cache data in a PostgreSQL DB, providing instant UI updates and rich real-time dashboards.
          </p>
        </div>
      </div>
    </div>
  );
}
