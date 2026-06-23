import { useState, useEffect } from "react";
import { API_URL, CONTRACT_ADDRESS_V3, SEPOLIA_NETWORK, SEPOLIA_CHAIN_ID } from "../config";

function StatusItem({ label, status, ok, detail, href }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-slate-500">{label}:</span>
      <span
        className={`h-2 w-2 rounded-full ${
          ok
            ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse"
            : status === "checking"
            ? "bg-amber-500"
            : "bg-rose-500"
        }`}
      />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-300 hover:text-sky-200 transition-colors underline truncate max-w-[140px] sm:max-w-none"
        >
          {detail}
        </a>
      ) : (
        <span className={ok ? "text-sky-300 font-bold" : "text-rose-400"}>{detail}</span>
      )}
    </div>
  );
}

export default function SystemStatus() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [chainStatus, setChainStatus] = useState("checking");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_URL}/api/candidates`);
        if (res.ok) setBackendStatus("online");
        else setBackendStatus("error");
      } catch {
        setBackendStatus("offline");
      }
    };

    const updateChainStatus = (chainId) => {
      if (chainId === "0xaa36a7") setChainStatus("sepolia");
      else setChainStatus("wrong-network");
    };

    const initChain = async () => {
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: "eth_chainId" });
          updateChainStatus(chainId);
        } catch {
          setChainStatus("error");
        }
      } else {
        setChainStatus("no-wallet");
      }
    };

    checkBackend();
    initChain();

    const handleChainChanged = (chainId) => {
      updateChainStatus(chainId);
    };

    if (window.ethereum) {
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    const interval = setInterval(checkBackend, 30000);

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
      clearInterval(interval);
    };
  }, []);

  const networkLabel = `${SEPOLIA_NETWORK} · Chain ${SEPOLIA_CHAIN_ID}`;

  return (
    <div className="border-b border-app bg-app-bg/90">
      <div className="page-container py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm font-mono overflow-x-auto">
          <StatusItem
            label="API"
            status={backendStatus}
            ok={backendStatus === "online"}
            detail={backendStatus.toUpperCase()}
          />

          <div className="hidden sm:block h-3 w-px bg-app-border shrink-0" />

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-slate-500">NETWORK:</span>
            <span
              className={`h-2 w-2 rounded-full ${
                chainStatus === "sepolia"
                  ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse"
                  : chainStatus === "checking"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
            {chainStatus === "sepolia" ? (
              <a
                href={`https://sepolia.etherscan.io`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-300 hover:text-sky-200 transition-colors underline truncate max-w-[140px] sm:max-w-none"
              >
                {networkLabel} (LIVE)
              </a>
            ) : chainStatus === "no-wallet" ? (
              <span className="text-amber-400">
                {networkLabel} — Connect MetaMask to verify
              </span>
            ) : (
              <span className="text-rose-400">
                {networkLabel} — {chainStatus.toUpperCase()}
              </span>
            )}
          </div>

          <div className="hidden md:block h-3 w-px bg-app-border shrink-0" />

          <div className="hidden md:flex">
            <StatusItem
              label="CONTRACT"
              status="online"
              ok
              detail={`${CONTRACT_ADDRESS_V3.slice(0, 10)}...${CONTRACT_ADDRESS_V3.slice(-6)}`}
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS_V3}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
