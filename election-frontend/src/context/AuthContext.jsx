import { createContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import ABI from "../abi/Election.json";
import { CONTRACT_ADDRESS } from "../config";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [student, setStudent] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voterStatus, setVoterStatus] = useState({ registered: false, verified: false, hasVoted: false });
  const [loading, setLoading] = useState(false);

  const checkVoterStatus = async (address) => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, provider);
      
      // Check Admin
      const adminAddress = await contract.admin();
      setIsAdmin(address.toLowerCase() === adminAddress.toLowerCase());

      // Check Voter Status
      const voter = await contract.getVoter(address);
      setVoterStatus({
        registered: voter.registered,
        verified: voter.verified,
        hasVoted: voter.hasVoted
      });
    } catch (err) {
      console.error("Status check error:", err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not found!");
    
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWallet(accounts[0]);
      await checkVoterStatus(accounts[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const registerAsVoter = async () => {
    if (!wallet) return alert("Connect wallet first");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, signer);
      
      const tx = await contract.registerVoter();
      await tx.wait();
      alert("Registration successful! Please wait for admin verification.");
      await checkVoterStatus(wallet);
    } catch (err) {
      console.error(err);
      alert(err.reason || "Registration failed. Ensure election is in Registration state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        const address = accounts[0] || null;
        setWallet(address);
        if (address) checkVoterStatus(address);
        else {
          setIsAdmin(false);
          setVoterStatus({ registered: false, verified: false, hasVoted: false });
        }
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      wallet, 
      setWallet, 
      student, 
      setStudent, 
      isAdmin, 
      voterStatus, 
      connectWallet, 
      registerAsVoter,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
