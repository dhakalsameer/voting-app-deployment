import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import ABI from "../abi/Election3.json";
import { CONTRACT_ADDRESS_V3, API_URL } from "../config";
import { AuthContext } from "./AuthContextValue";

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

export function AuthProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [student, setStudent] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  });
  const [voterStatus, setVoterStatus] = useState({
    registered: false,
    walletLinked: false,
    verified: false,
    canVote: false,
    hasVoted: false,
    image_cid: null,
    name: null,
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (window.ethereum && window.ethereum.setMaxListeners) {
      window.ethereum.setMaxListeners(50);
    }
  }, []);

  const checkVoterStatus = useCallback(async (address) => {
    try {
      setAuthError(null);
      if (!address || !provider) return;

      let adminMatch = false;
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS_V3, ABI.abi, provider);
        const adminAddress = await contract.admin();
        adminMatch = address.toLowerCase() === adminAddress.toLowerCase();
      } catch (adminErr) {
        console.error("Admin check failed:", adminErr);
        setAuthError("Could not verify admin status. Check contract address & network.");
      }
      setIsAdmin(adminMatch);

      const response = await fetch(`${API_URL}/api/voters/me?wallet=${address}`);
      const data = await response.json();

      setStudent(data.registered ? data : null);
      setVoterStatus({
        registered: Boolean(data.registered),
        walletLinked: Boolean(data.walletLinked),
        verified: Boolean(data.verified),
        canVote: Boolean(data.canVote),
        hasVoted: Boolean(data.hasVoted),
        image_cid: data.image_cid || null,
        name: data.name || null,
      });
    } catch (err) {
      console.error("Status check error:", err);
      setAuthError(err.message || "Failed to check voter status");
    }
  }, [provider]);

  const disconnectWallet = async () => {
    setWallet(null);
    setStudent(null);
    setIsAdmin(false);
    setVoterStatus({
      registered: false,
      walletLinked: false,
      verified: false,
      canVote: false,
      hasVoted: false,
      image_cid: null,
      name: null,
    });
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch {
      // wallet_revokePermissions not supported (MetaMask), fallback to clearing state
    }
  };

  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      if (isMobileBrowser()) {
        setShowMobilePrompt(true);
      } else {
        alert("MetaMask not found! Please install the MetaMask browser extension.");
      }
      return null;
    }

    setLoading(true);
    try {
      const p = provider || new ethers.BrowserProvider(window.ethereum);
      const accounts = await p.send("eth_requestAccounts", []);
      setWallet(accounts[0]);
      if (!provider) setProvider(p);
      await checkVoterStatus(accounts[0]);
      return accounts[0];
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      const address = accounts[0] || null;
      setWallet(address);
      setStudent(null);
      setVoterStatus({
        registered: false,
        walletLinked: false,
        verified: false,
        canVote: false,
        hasVoted: false,
        image_cid: null,
        name: null,
      });

      if (address) {
        checkVoterStatus(address);
      } else {
        setIsAdmin(false);
        setStudent(null);
        setVoterStatus({
          registered: false,
          walletLinked: false,
          verified: false,
          canVote: false,
          hasVoted: false,
          image_cid: null,
          name: null,
        });
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [checkVoterStatus]);

  // Auto-restore MetaMask connection on page load
  useEffect(() => {
    if (!window.ethereum) return;
    const restore = async () => {
      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        const accounts = await p.send("eth_accounts", []);
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          setProvider(p);
          const contract = new ethers.Contract(CONTRACT_ADDRESS_V3, ABI.abi, p);
          const adminAddr = await contract.admin();
          setIsAdmin(accounts[0].toLowerCase() === adminAddr.toLowerCase());
          checkVoterStatus(accounts[0]);
        }
      } catch (e) {
        console.error("Auto-restore wallet error:", e);
      }
    };
    restore();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        wallet,
        setWallet,
        student,
        setStudent,
        isAdmin,
        voterStatus,
        connectWallet,
        disconnectWallet,
        checkVoterStatus,
        loading,
        authError,
        provider,
      }}
    >
      {children}

      {showMobilePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface-solid p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-app-heading">Connect Wallet</h3>
              <button
                onClick={() => setShowMobilePrompt(false)}
                className="h-10 w-10 flex items-center justify-center rounded-lg text-app-muted-text hover:text-app-heading cursor-pointer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-app-body leading-relaxed">
              MetaMask is not detected in this browser. To connect your wallet on mobile:
            </p>

            <ol className="space-y-2 text-sm text-app-body">
              <li className="flex gap-2">
                <span className="font-bold text-app-accent shrink-0">1.</span>
                <span>Tap the button below to open this site in MetaMask&apos;s built-in browser.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-app-accent shrink-0">2.</span>
                <span>Connect your wallet from inside the MetaMask browser.</span>
              </li>
            </ol>

            <a
              href={`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center text-base"
              onClick={() => setShowMobilePrompt(false)}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 12.5l8 3.5 8-3.5L12 2z" opacity="0.6" />
                <path d="M12 16.5l-8-3.5L12 22l8-9-8 3.5z" />
              </svg>
              Open in MetaMask
            </a>

            <p className="text-xs text-center text-app-muted-text">
              Don&apos;t have MetaMask?{" "}
              <a
                href="https://play.google.com/store/apps/details?id=io.metamask"
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-accent underline"
              >
                Install from Play Store
              </a>
            </p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
