import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function WalletButton() {
  const { wallet, connectWallet, loading } = useContext(AuthContext);

  return (
    <button 
      onClick={connectWallet}
      className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
        wallet ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"
      }`}
      disabled={loading}
    >
      {loading ? "Connecting..." : wallet ? `Connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect Wallet"}
    </button>
  );
}

export default WalletButton;