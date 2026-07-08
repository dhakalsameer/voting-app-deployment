const STEPS = [
  {
    step: 1,
    title: "Install MetaMask",
    icon: "🦊",
    summary: "MetaMask is a browser wallet that connects you to the blockchain. You need it to vote.",
    details: [
      "Go to https://metamask.io and click \"Download\".",
      "Add the MetaMask extension to Chrome, Firefox, or Brave.",
      "Create a new wallet — write down your secret recovery phrase and store it safely. Never share it.",
      "Set a strong password. You're now the owner of a blockchain wallet address.",
    ],
    tip: "Your wallet address is like your email address — share it freely. Your secret phrase is like your password — never share it.",
  },
  {
    step: 2,
    title: "Switch to Sepolia Network",
    icon: "🌐",
    summary: "This election runs on the Sepolia test network, not the real Ethereum network.",
    details: [
      "In MetaMask, open the network dropdown at the top (it probably says \"Ethereum Mainnet\").",
      "Click \"Add Network\" then \"Add a network manually\".",
      "Enter:",
      "  • Network Name: Sepolia",
      "  • RPC URL: https://rpc.sepolia.org",
      "  • Chain ID: 11155111",
      "  • Currency Symbol: SepoliaETH",
      "  • Block Explorer: https://sepolia.etherscan.io",
      'Click "Save". Then select "Sepolia" from the network dropdown.',
    ],
    tip: "Sepolia ETH has no real value — it's play money. You can't lose real funds here.",
  },
  {
    step: 3,
    title: "Get Free Test ETH",
    icon: "⛽",
    summary: "You need a small amount of Sepolia ETH to pay for the transaction fee (gas) when you vote.",
    details: [
      "Go to a Sepolia faucet (a site that gives free test ETH), for example:",
      "  • https://sepoliafaucet.com",
      "  • https://faucet.quicknode.com/ethereum/sepolia",
      "  • https://www.alchemy.com/faucets/ethereum-sepolia",
      "Copy your wallet address from MetaMask (click your account name to copy).",
      "Paste it into the faucet and request ETH. You'll receive 0.5–1 SepoliaETH within a minute.",
      "0.001 ETH is enough for hundreds of votes, so you only need to do this once.",
    ],
    tip: "If a faucet is dry, try another one. Search \"Sepolia faucet 2026\" for the latest options.",
  },
  {
    step: 4,
    title: "Create Your Voter Account",
    icon: "📋",
    summary: "Fill in your details on the platform so the admin knows who you are.",
    details: [
      "Go to the Vote tab and click \"Register\" or open the Student Portal.",
      "Enter your full name, student ID, year, gender, and upload a photo.",
      "Click \"Register\" — this creates your profile in the system.",
    ],
    tip: "Use the exact name and student ID that the college has on record. Mismatches can delay verification.",
  },
  {
    step: 5,
    title: "Link Your Wallet",
    icon: "🔗",
    summary: "Connect your MetaMask wallet to prove you are the account owner.",
    details: [
      "Click \"Connect Wallet\" on the platform.",
      "MetaMask will pop up — select your account and click \"Connect\".",
      "Then click \"Link Wallet\" — MetaMask will ask you to sign a message.",
      'Signing doesn\'t cost any gas (it\'s free). It just proves you own the wallet.',
      "Once linked, your wallet address is associated with your voter profile.",
    ],
    tip: "Make sure you're on the Sepolia network in MetaMask before connecting.",
  },
  {
    step: 6,
    title: "Get Verified by Admin",
    icon: "✅",
    summary: "An admin checks your details and confirms you're a legitimate voter.",
    details: [
      "After linking your wallet, your status changes to \"Awaiting Verification\".",
      "The admin reviews your name, student ID, and wallet address.",
      "Once approved, your status shows \"Ready to Vote\" — you're all set.",
      "This step exists to prevent fake accounts and ensure one person = one vote.",
    ],
    tip: "If verification takes too long, contact the admin directly. Your status is shown on the Vote page.",
  },
  {
    step: 7,
    title: "Cast Your Vote",
    icon: "🗳️",
    summary: "Select your candidates and submit your ballot to the blockchain.",
    details: [
      "Once voting is live (phase changes to Voting), the candidate list appears.",
      "Select one President, one Secretary, and up to 5 General Members.",
      "You must select at least 2 female General Members if you pick any.",
      "Review your ballot in the Ballot Summary section.",
      'Click "Cast 7 Votes" — a confirmation modal appears.',
      'Review your choices and click "Confirm & Submit".',
      "MetaMask opens — review the transaction details and click \"Confirm\".",
      "Wait for the transaction to be mined (10–30 seconds). A green success toast appears.",
    ],
    tip: "The transaction fee (gas) is paid in SepoliaETH from your wallet. The 0.001 ETH you got earlier covers it easily.",
  },
  {
    step: 8,
    title: "Your Vote Is on the Blockchain Forever",
    icon: "🔒",
    summary: "Once submitted, your vote is permanent and cannot be changed or erased.",
    details: [
      "Each vote is recorded as a transaction on the Sepolia blockchain.",
      "No one — not even the admin — can modify or delete your vote.",
      "The vote count is public and verifiable by anyone on the block explorer.",
      "You can see your transaction by clicking the link in the success toast.",
    ],
    tip: "This transparency ensures a fair election. Every vote is counted exactly once.",
  },
  {
    step: 9,
    title: "Watch Results in Real Time",
    icon: "📊",
    summary: "Live results appear as votes roll in. Final results are published after voting ends.",
    details: [
      "During voting, the Results tab shows live vote counts per candidate.",
      "The turnout percentage updates every 10 seconds.",
      "After voting ends (phase changes to Ended), the system snapshots the final results.",
      "Winners are declared — the candidate with the most votes per position wins.",
      "If you won, a congratulations banner appears on your Vote page.",
      "Past election results are saved in the election history for future reference.",
    ],
    tip: "Refresh the page or switch tabs to see the latest updates. Results update automatically every 10 seconds.",
  },
];

function StepCard({ s }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-app-accent-soft flex items-center justify-center text-2xl border border-app-accent-border">
          {s.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted-text bg-app-muted px-2 py-0.5 rounded-full">
              Step {s.step}
            </span>
            <h3 className="text-lg font-bold text-app-heading">{s.title}</h3>
          </div>
          <p className="text-sm text-app-body mt-1.5">{s.summary}</p>
        </div>
      </div>
      <div className="space-y-1.5 pl-16">
        {s.details.map((d, i) => (
          <p key={i} className={`text-sm leading-relaxed ${d.startsWith("  •") ? "text-app-muted-text pl-4 font-mono" : "text-app-body"}`}>
            {d}
          </p>
        ))}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">💡</span>
          <p className="text-sm text-app-muted-text">{s.tip}</p>
        </div>
      </div>
    </div>
  );
}

export default function VoterGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3 pb-2">
        <div className="text-5xl">🗳️</div>
        <h1 className="text-3xl font-black text-app-heading">Voter Guide</h1>
        <p className="text-base text-app-body max-w-lg mx-auto">
          Everything you need to know — from installing MetaMask to casting your vote
          and watching the results.
        </p>
      </div>

      <div className="space-y-5">
        {STEPS.map((s) => (
          <StepCard key={s.step} s={s} />
        ))}
      </div>

      <div className="rounded-xl border border-app-accent-border bg-app-accent-soft p-6 space-y-3 text-center">
        <span className="text-3xl">❓</span>
        <h3 className="text-base font-bold text-app-heading">Still have questions?</h3>
        <p className="text-sm text-app-body">
          Contact the election admin or ask during the registration period.
          Every step is designed to be simple — you've got this.
        </p>
      </div>
    </div>
  );
}
