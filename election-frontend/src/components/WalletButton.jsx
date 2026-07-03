import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useBalance } from "../hooks/useBalance";
import { useToast } from "./ui/Toast";

export default function WalletButton() {
  const { wallet, connectWallet, loading } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const { error: showError } = useToast();

  if (wallet) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-app-border bg-app-accent-soft px-4 py-2">
        <span className="flex items-center gap-1.5 text-base font-mono text-app-muted-text whitespace-nowrap">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 12.5l8 3.5 8-3.5L12 2z" opacity="0.6" />
            <path d="M12 16.5l-8-3.5L12 22l8-9-8 3.5z" />
          </svg>
          {balance ? `${Number(balance).toFixed(4)} ETH` : "--"}
        </span>
        <span className="w-px h-5 bg-app-border/50 shrink-0" />
        <span className="text-base font-mono text-app-accent whitespace-nowrap">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
      </div>
    );
  }

  return (
    <button
      onClick={async () => {
        try { await connectWallet(); }
        catch (err) { showError(err.message); }
      }}
      disabled={loading}
      className="text-base font-semibold text-app-accent bg-app-accent-soft px-5 py-2.5 rounded-lg border border-app-border hover:bg-app-accent-soft/80 transition-all cursor-pointer disabled:opacity-40 inline-flex items-center gap-2"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M16 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0" />
      </svg>
      {loading ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
