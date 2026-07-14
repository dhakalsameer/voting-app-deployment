import { useState } from "react";

const STEPS = [
  {
    step: 1,
    title: "Install MetaMask",
    icon: "🦊",
    summary: "A browser wallet that connects you to the blockchain.",
    details: [
      "Go to https://metamask.io and add the extension to Chrome, Firefox, or Brave.",
      "Create a wallet — write down your secret recovery phrase. Never share it.",
    ],
    tip: "Your wallet address is like an email — share it freely. Your secret phrase is like a password — never share it.",
  },
  {
    step: 2,
    title: "Switch to Sepolia Network",
    icon: "🌐",
    summary: "The election runs on Sepolia testnet, not real Ethereum.",
    details: [
      "In MetaMask, open the network dropdown and click \"Add Network\" → \"Add a network manually\".",
      "Enter: Network Name = Sepolia, RPC = https://rpc.sepolia.org, Chain ID = 11155111, Currency = SepoliaETH.",
      'Click "Save" and select Sepolia from the dropdown.',
    ],
    tip: "Sepolia ETH has no real value — it's play money for testing.",
  },
  {
    step: 3,
    title: "Get Free Test ETH",
    icon: "⛽",
    summary: "You need a tiny amount of SepoliaETH for the transaction fee (gas).",
    details: [
      "Visit a Sepolia faucet like https://sepoliafaucet.com or https://faucet.quicknode.com/ethereum/sepolia.",
      "Copy your wallet address from MetaMask, paste it in, and request ETH.",
      "You'll receive 0.5–1 SepoliaETH within a minute. 0.001 ETH is enough for hundreds of votes.",
    ],
    tip: "If one faucet is dry, try another. Search \"Sepolia faucet 2026\" for the latest options.",
  },
  {
    step: 4,
    title: "Create Your Voter Account",
    icon: "📋",
    summary: "Enter your details so the admin knows who you are.",
    details: [
      "Click \"Register\" on the Vote page or open the Student Portal.",
      "Enter your full name, student ID, year, gender, and upload a photo.",
      "Click \"Register\" to create your profile.",
    ],
    tip: "Use the exact name and ID your college has on record. Mismatches delay verification.",
  },
  {
    step: 5,
    title: "Link Your Wallet",
    icon: "🔗",
    summary: "Connect MetaMask to prove you own this wallet.",
    details: [
      'Click "Connect Wallet" then "Link Wallet" on the platform.',
      "MetaMask will ask you to sign a message — this is free (no gas cost).",
      "Signing proves you own the wallet without spending any ETH.",
    ],
    tip: "Make sure you're on Sepolia network in MetaMask before connecting.",
  },
  {
    step: 6,
    title: "Get Verified by Admin",
    icon: "✅",
    summary: "An admin checks your details and approves you to vote.",
    details: [
      'After linking, your status changes to "Awaiting Verification".',
      "The admin reviews your name, ID, and wallet address.",
      'Once approved, your status shows "Ready to Vote".',
    ],
    tip: "If verification takes too long, contact the admin directly.",
  },
  {
    step: 7,
    title: "Cast Your Vote",
    icon: "🗳️",
    summary: "Select your candidates and submit your ballot to the blockchain.",
    details: [
      "Once voting is live, pick one President, one Secretary, and up to 5 General Members.",
      "You must select at least 2 female General Members if you pick any.",
      'Review your ballot in the Ballot Summary, then click "Cast 7 Votes".',
      'In the confirmation modal, click "Confirm & Submit".',
      "MetaMask opens — click \"Confirm\" to send the transaction.",
      "Wait 10–30 seconds for the green success toast.",
    ],
    tip: 'The gas fee is paid in SepoliaETH. The 0.001 ETH you got earlier covers it easily.',
  },
  {
    step: 8,
    title: "Your Vote Is on the Blockchain Forever",
    icon: "🔒",
    summary: "Once submitted, your vote is permanent and tamper-proof.",
    details: [
      "Each vote is a transaction on the Sepolia blockchain — no one can modify or delete it.",
      "The vote count is public and verifiable by anyone on the block explorer.",
      "Click the transaction link in the success toast to see your vote on-chain.",
    ],
    tip: "This transparency ensures a fair election. Every vote is counted exactly once.",
  },
  {
    step: 9,
    title: "Watch Results in Real Time",
    icon: "📊",
    summary: "Live results appear during voting. Final results are published after.",
    details: [
      "The Results tab shows live vote counts and turnout percentage.",
      "After voting ends, the system snapshots the final results and declares winners.",
      "If you won, a congratulations banner appears on your Vote page.",
      "Past election results are saved in history for future reference.",
    ],
    tip: "Results update every 10 seconds automatically.",
  },
];

function StepCard({ s }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left cursor-pointer hover:bg-app-elevated/30 transition-colors"
      >
        <div className="h-12 w-12 shrink-0 rounded-xl bg-app-accent-soft flex items-center justify-center text-2xl border border-app-accent-border">
          {s.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted-text bg-app-muted px-2 py-0.5 rounded-full">
              Step {s.step}
            </span>
            <h3 className="text-base font-bold text-app-heading">{s.title}</h3>
          </div>
          <p className="text-sm text-app-body mt-0.5">{s.summary}</p>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-app-muted-text transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pl-[4.5rem] space-y-2 transition-all">
          {s.details.map((d, i) => (
            <p key={i} className={`text-sm leading-relaxed ${d.startsWith("  •") ? "text-app-muted-text pl-4 font-mono" : "text-app-body"}`}>
              {d}
            </p>
          ))}
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 mt-2">
            <span className="text-base shrink-0">💡</span>
            <p className="text-sm text-app-muted-text">{s.tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VoterGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-2 pb-2">
        <div className="text-5xl">🗳️</div>
        <h1 className="text-2xl font-black text-app-heading">Voter Guide</h1>
        <p className="text-sm text-app-body max-w-lg mx-auto">
          From installing MetaMask to casting your vote — click each step to expand.
        </p>
      </div>

      <div className="space-y-3">
        {STEPS.map((s) => (
          <StepCard key={s.step} s={s} />
        ))}
      </div>

      <div className="rounded-xl border border-app-accent-border bg-app-accent-soft p-5 text-center space-y-2">
        <span className="text-3xl">❓</span>
        <p className="text-sm text-app-body">
          Still stuck? Contact the election admin or ask during registration.
        </p>
      </div>
    </div>
  );
}
