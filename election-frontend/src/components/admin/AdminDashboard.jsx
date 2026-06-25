import { useState, useContext } from "react";
import ElectionControl from "./ElectionControl";
import VerifyVoter from "./VerifyVoter";
import GenerateCodes from "./GenerateCodes";
import StudentList from "./StudentList";
import GasDistribution from "./GasDistribution";

import { AuthContext } from "../../context/AuthContextValue";
import { useBalance } from "../../hooks/useBalance";

export default function AdminDashboard() {
  const [tab, setTab] = useState("controls");
  const { wallet } = useContext(AuthContext);
  const { balance } = useBalance(wallet);

  const tabs = [
    { id: "controls", label: "Controls" },
    { id: "voters", label: "Voters" },
    { id: "gas", label: "Gas" },
  ];

  return (
    <div className="rounded-xl border border-app bg-app-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-app flex items-center justify-between">
        <h2 className="text-base font-semibold text-app-heading">Admin</h2>
        {balance && (
          <span className="text-sm font-mono text-app-muted-text">{Number(balance).toFixed(4)} ETH</span>
        )}
      </div>

      {balance !== null && Number(balance) < 0.05 && (
        <div className="mx-4 mt-3 px-3 py-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
          <p className="text-sm text-rose-400">Low balance — {Number(balance).toFixed(4)} ETH</p>
        </div>
      )}

      <div className="flex gap-1 px-4 pt-4 pb-2 border-b border-app/50 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              tab === t.id
                ? "text-app-accent bg-app-accent-soft"
                : "text-app-muted-text hover:text-app-heading"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "controls" && <ElectionControl />}
        {tab === "voters" && (
          <div className="space-y-4">
            <VerifyVoter />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GenerateCodes />
              <StudentList />
            </div>
          </div>
        )}
        {tab === "gas" && <GasDistribution />}
      </div>
    </div>
  );
}
