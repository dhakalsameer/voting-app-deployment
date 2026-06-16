import { ethers } from "ethers";

export default function Wallet({ setAccount }) {
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);

    setAccount(accounts[0]);
  }

  return <button onClick={connectWallet}>Connect MetaMask</button>;
}
