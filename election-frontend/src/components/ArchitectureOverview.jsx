function SystemArchitectureDiagram() {
  return (
    <svg viewBox="0 0 720 430" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05"/></linearGradient>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/><stop offset="100%" stopColor="#22c55e" stopOpacity="0.05"/></linearGradient>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04"/></linearGradient>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity="0.12"/><stop offset="100%" stopColor="#a78bfa" stopOpacity="0.04"/></linearGradient>
      </defs>

      {/* Layer labels */}
      <text x="360" y="26" textAnchor="middle" fill="var(--app-muted-text)" fontWeight="700" fontSize="12" letterSpacing="2">PRESENTATION LAYER</text>
      <text x="360" y="142" textAnchor="middle" fill="var(--app-muted-text)" fontWeight="700" fontSize="12" letterSpacing="2">APPLICATION LAYER</text>
      <text x="360" y="388" textAnchor="middle" fill="var(--app-muted-text)" fontWeight="700" fontSize="12" letterSpacing="2">DATA &amp; CONSENSUS LAYER</text>

      {/* Frontend → Backend arrow */}
      <line x1="360" y1="115" x2="360" y2="150" stroke="var(--app-border)" strokeWidth="1.5" strokeDasharray="4 3"/>
      <polygon points="355,148 360,158 365,148" fill="var(--app-border)"/>

      {/* Backend → DB arrow */}
      <line x1="246" y1="236" x2="246" y2="272" stroke="var(--app-border)" strokeWidth="1.5" strokeDasharray="4 3"/>
      <polygon points="241,270 246,280 251,270" fill="var(--app-border)"/>

      {/* Backend → Blockchain arrow */}
      <line x1="476" y1="236" x2="476" y2="272" stroke="var(--app-border)" strokeWidth="1.5" strokeDasharray="4 3"/>
      <polygon points="471,270 476,280 481,270" fill="var(--app-border)"/>

      {/* ── FRONTEND ── */}
      <rect x="100" y="36" width="520" height="78" rx="10" fill="var(--app-surface)" stroke="var(--app-accent-border)" strokeWidth="1.5"/>
      <rect x="100" y="36" width="520" height="78" rx="10" fill="url(#fg)"/>
      <text x="360" y="64" textAnchor="middle" fill="var(--app-accent)" fontWeight="800" fontSize="14" letterSpacing="1">REACT FRONTEND</text>
      <text x="360" y="84" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Vite + Socket.IO Client</text>
      <text x="360" y="100" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Student Portal · Admin Dashboard · Live Results</text>

      {/* Frontend icon */}
      <rect x="120" y="50" width="26" height="26" rx="7" fill="var(--app-accent-soft)"/>
      <rect x="125" y="55" width="16" height="12" rx="2" stroke="var(--app-accent)" strokeWidth="1.5" fill="none"/>
      <line x1="129" y1="67" x2="137" y2="67" stroke="var(--app-accent)" strokeWidth="1.5"/>

      {/* ── BACKEND ── */}
      <rect x="80" y="162" width="560" height="74" rx="10" fill="var(--app-surface)" stroke="var(--app-trust-border)" strokeWidth="1.5"/>
      <rect x="80" y="162" width="560" height="74" rx="10" fill="url(#bg)"/>
      <text x="360" y="190" textAnchor="middle" fill="var(--app-trust)" fontWeight="800" fontSize="14" letterSpacing="1">NODE.JS BACKEND</text>
      <text x="360" y="210" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Express API · Socket.IO · Event Sync Engine</text>
      <text x="360" y="226" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Merkle Service · IPFS Gateway · Gas Distribution</text>

      {/* Backend icon */}
      <rect x="100" y="174" width="26" height="26" rx="7" fill="var(--app-trust-soft)"/>
      <rect x="105" y="179" width="16" height="16" rx="3" stroke="var(--app-trust)" strokeWidth="1.5" fill="none"/>
      <circle cx="113" cy="187" r="2" fill="var(--app-trust)"/>

      {/* ── DATABASE ── */}
      <rect x="115" y="285" width="240" height="70" rx="10" fill="var(--app-surface)" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4"/>
      <rect x="115" y="285" width="240" height="70" rx="10" fill="url(#cg)"/>
      <ellipse cx="235" cy="294" rx="32" ry="4" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.3"/>
      <text x="235" y="320" textAnchor="middle" fill="#f59e0b" fontWeight="800" fontSize="15" letterSpacing="1">POSTGRESQL</text>
      <text x="235" y="342" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Candidates · Voters · Events</text>

      {/* ── BLOCKCHAIN ── */}
      <rect x="370" y="285" width="240" height="70" rx="10" fill="var(--app-surface)" stroke="var(--app-accent-border)" strokeWidth="1.5"/>
      <rect x="370" y="285" width="240" height="70" rx="10" fill="url(#sg)"/>
      <text x="490" y="318" textAnchor="middle" fill="var(--app-accent)" fontWeight="800" fontSize="14" letterSpacing="1">SEPOLIA TESTNET</text>
      <text x="490" y="338" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Election3 Smart Contract</text>
      <text x="490" y="350" textAnchor="middle" fill="var(--app-muted-text)" fontSize="13" fontWeight="500">Merkle Proof Verification</text>
    </svg>
  );
}

export default function ArchitectureOverview() {
  const phases = [
    { label: "Created", desc: "Admin deploys a new election cycle; candidate list is seeded on-chain.", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
    { label: "Registration", desc: "Students register, link wallets, and get verified via Merkle whitelist.", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { label: "Voting", desc: "Eligible voters cast secret ballots. Each vote is recorded immutably on the blockchain.", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Ended", desc: "Voting closes. Results are finalized on-chain and viewable by anyone.", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  ];

  const architectures = [
    {
      icon: "merkle",
      title: "Merkle Whitelist",
      desc: "Eligible voters are organized into a Merkle tree off-chain. Only the 32-byte root is stored on the contract, reducing storage costs by ~99%. Voters submit a Merkle proof alongside their vote — the contract verifies inclusion without storing individual addresses.",
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: "contract",
      title: "Smart Contract",
      desc: "A Solidity contract manages the entire election lifecycle: phase transitions, candidate registration, vote casting, and result finalization. All state changes emit events that the backend indexes for real-time display.",
      accent: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      icon: "sync",
      title: "Sync Engine",
      desc: "A Node.js background service polls the blockchain every 10 seconds. It detects new events (votes, registrations, phase changes) via contract queries and pushes updates to connected clients through Socket.IO for instant UI reactivity.",
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: "db",
      title: "Database Cache",
      desc: "PostgreSQL stores student profiles, candidate records, election snapshots, and a materialized event log. This enables fast queries for analytics, paginated history, and rich dashboards without burdening the RPC endpoint.",
      accent: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
    {
      icon: "gas",
      title: "Gas Distribution",
      desc: "The admin can distribute small amounts of ETH to cover voter gas fees. This ensures that all verified voters can participate without needing to fund their own wallets with testnet ETH.",
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      icon: "admin",
      title: "Admin Controls",
      desc: "Admin functions — phase transitions, Merkle root updates, candidate registration — require the admin wallet. All admin actions emit on-chain events, making every configuration change auditable.",
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  const svgs = {
    merkle: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    contract: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg>,
    sync: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    db: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    gas: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16"/><path d="M5 20V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14"/><path d="M9 10h6"/><path d="M9 14h6"/><path d="M9 6V4"/><path d="M15 6V4"/></svg>,
    admin: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  };

  return (
    <div id="architecture-overview" className="space-y-8 sm:space-y-10">

      {/* ── Hero ── */}
      <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-app shadow-card relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-app-heading uppercase tracking-widest">
              Decentralized Voting System
            </h2>
          </div>
          <p className="text-base sm:text-lg text-app-body leading-relaxed max-w-3xl">
            A fully on-chain election system built on the Sepolia testnet. Voter eligibility is enforced via Merkle proofs,
            every vote is recorded immutably on the blockchain, and a real-time sync engine powers live dashboards —
            all while keeping gas costs minimal.
          </p>
        </div>
      </div>

      {/* ── System Architecture Flowchart ── */}
      <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-app shadow-card">
        <h3 className="text-xl sm:text-2xl font-black text-app-heading uppercase tracking-widest mb-2">
          System Architecture
        </h3>
        <p className="text-base text-app-body mb-6">
          How the frontend, backend, database, and blockchain fit together.
        </p>
        <div className="bg-app-muted/20 rounded-2xl p-4 sm:p-6 lg:p-8 border border-app/50 overflow-x-auto">
          <div className="min-w-[580px]">
            <SystemArchitectureDiagram />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
          {architectures.map((a) => (
            <div
              key={a.title}
              className="flex flex-col gap-3 bg-app-elevated/35 border border-app rounded-2xl p-5 transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg border ${a.accent}`}>
                  {svgs[a.icon]}
                </span>
                <h4 className="text-base font-bold text-app-heading">{a.title}</h4>
              </div>
              <p className="text-base text-app-body leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Election Lifecycle ── */}
      <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-app shadow-card">
        <h3 className="text-xl sm:text-2xl font-black text-app-heading uppercase tracking-widest mb-2">
          Election Lifecycle
        </h3>
        <p className="text-base text-app-body mb-6">
          Each election progresses through four distinct phases, controlled by the smart contract admin.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {phases.map((p, i) => (
            <div key={p.label} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <div className="hidden sm:block absolute -left-3 top-5 w-3 h-px bg-app-border" />
              )}
              <div className={`w-10 h-10 rounded-full border ${p.color} flex items-center justify-center text-base font-black mb-3`}>
                {i + 1}
              </div>
              <h4 className="text-base font-bold text-app-heading mb-1">{p.label}</h4>
              <p className="text-base text-app-body leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Benefits ── */}
      <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border border-app shadow-card">
        <h3 className="text-xl sm:text-2xl font-black text-app-heading uppercase tracking-widest mb-6">
          Why Decentralized?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border-l-2 border-[var(--app-trust-border)] pl-5">
            <h4 className="text-base font-bold text-app-heading mb-1">Immutability</h4>
            <p className="text-base text-app-body leading-relaxed">
              Once a vote is recorded on the blockchain, it can never be altered or deleted. The election result is final and verifiable by anyone.
            </p>
          </div>
          <div className="border-l-2 border-[var(--app-accent-border)] pl-5">
            <h4 className="text-base font-bold text-app-heading mb-1">Transparency</h4>
            <p className="text-base text-app-body leading-relaxed">
              Every transaction — vote, registration, phase change — is publicly visible on Etherscan. Anyone can independently audit the election.
            </p>
          </div>
          <div className="border-l-2 border-[var(--app-ballot-border)] pl-5">
            <h4 className="text-base font-bold text-app-heading mb-1">Trustless</h4>
            <p className="text-base text-app-body leading-relaxed">
              No central authority controls the outcome. The smart contract enforces the rules deterministically — not even the admin can insert fraudulent votes.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
