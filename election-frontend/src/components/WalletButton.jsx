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
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-mono text-app-muted-text">
          Ξ {balance ? Number(balance).toFixed(4) : "--"}
        </span>
        <span className="text-sm font-mono text-app-accent bg-app-accent-soft px-3 py-1.5 rounded-md border border-app-border">
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </span>
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
      className="text-sm font-semibold text-app-accent bg-app-accent-soft px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-accent-soft/80 transition-all cursor-pointer disabled:opacity-40"
    >
      {loading ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
