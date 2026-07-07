import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import ABI from "../abi/Election3.json";
import { CONTRACT_ADDRESS_V3, API_URL } from "../config";
import { AuthContext } from "./AuthContextValue";

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

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found!");
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
        checkVoterStatus,
        loading,
        authError,
        provider,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
