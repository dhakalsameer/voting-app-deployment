import { useEffect, useState, useContext, useRef } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";

/**
 * Returns the Sepolia ETH balance of the connected wallet.
 * @param {string|null} address — wallet address to query (defaults to connected wallet)
 * @returns {{ balance: string|null, loading: boolean, error: string|null }}
 */
export function useBalance(address) {
  const { provider } = useContext(AuthContext);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!provider || !address) return;

    async function fetchBalance() {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const wei = await provider.getBalance(address);
        if (mountedRef.current) setBalance(ethers.formatEther(wei));
      } catch (err) {
        if (mountedRef.current) setError(err.message || "Balance fetch failed");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchBalance();

    // Poll every 15 seconds so balance updates after distribution
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [provider, address]);

  return { balance, loading, error };
}
