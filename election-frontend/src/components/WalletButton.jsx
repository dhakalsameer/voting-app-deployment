import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useBalance } from "../hooks/useBalance";
import { useToast } from "./ui/Toast";

export default function WalletButton() {
  const { wallet, student, connectWallet, disconnectWallet, loading } = useContext(AuthContext);
  const { balance } = useBalance(wallet);
  const { error: showError } = useToast();

  if (wallet) {
    return (
      <div className="flex items-center gap-1 md:gap-2 rounded-lg border border-app-border bg-app-accent-soft px-2 md:px-3 py-2.5">
        <span className="flex items-center gap-1 md:gap-1.5 text-sm md:text-base font-mono text-app-muted-text whitespace-nowrap">
          <svg className="h-4 w-4 md:h-5 md:w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 12.5l8 3.5 8-3.5L12 2z" opacity="0.6" />
            <path d="M12 16.5l-8-3.5L12 22l8-9-8 3.5z" />
          </svg>
          <span className="hidden sm:inline">{balance ? `${Number(balance).toFixed(4)} ETH` : "--"}</span>
          <span className="sm:hidden">{balance ? `${Number(balance).toFixed(2)} ETH` : "--"}</span>
        </span>
        {student?.student_id && (
          <>
            <span className="w-px h-5 bg-app-border/50 shrink-0" />
            <span className="text-sm md:text-base font-mono text-app-accent whitespace-nowrap hidden lg:inline">{student.student_id}</span>
          </>
        )}
        <span className="w-px h-5 bg-app-border/50 shrink-0" />
        <span className="text-sm lg:text-base font-mono text-app-accent whitespace-nowrap hidden lg:inline">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
        <button
          onClick={async () => {
            await disconnectWallet();
            showError("Wallet disconnected");
          }}
          className="ml-2 p-1.5 rounded-md hover:bg-rose-400/20 transition-colors cursor-pointer text-rose-400"
          title="Disconnect wallet"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
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
