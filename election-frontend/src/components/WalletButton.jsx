import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useBalance } from "../hooks/useBalance";
import { useToast } from "./ui/Toast";

function WalletIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 00-2 2v8a2 2 0 002 2h16v-5z" />
      <path d="M16 12h.01" />
      <path d="M3 7V5a2 2 0 012-2h14" />
    </svg>
  );
}

export default function WalletButton() {
  const { wallet, connectWallet, loading } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const { error: showError } = useToast();

  const handleConnect = async () => {
    if (wallet) return;
    try {
      await connectWallet();
    } catch (err) {
      console.error("Wallet connection error:", err);
      showError(err.message || "Failed to connect wallet. Make sure MetaMask is installed and unlocked.");
    }
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-bold font-mono text-amber-200"
          title={`Sepolia balance: ${balance ?? "--"} ETH`}
        >
          <span className="text-xs">Ξ</span>
          <span>{balance ? `${Number(balance).toFixed(4)}` : "--"}</span>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-sm font-bold font-mono text-sky-300 shadow-neon-glow
                     focus:outline-none focus:ring-1 focus:ring-sky-400/40"
          title={`Connected wallet: ${wallet}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
          </span>
          <span className="hidden sm:inline">
            {wallet.slice(0, 6)}…{wallet.slice(-4)}
          </span>
          <span className="sm:hidden">Linked</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-400 text-slate-950 px-4 py-2.5 text-sm font-black uppercase tracking-wider shadow-neon-glow hover:brightness-110 hover:shadow-neon-intense active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-400/30 cursor-pointer"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
          <span>Connecting…</span>
        </>
      ) : (
        <>
          <WalletIcon className="w-4 h-4" />
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
}
