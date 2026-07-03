import { useState, useContext, useRef, useEffect } from "react";
import ElectionControl from "./ElectionControl";
import VerifyVoter from "./VerifyVoter";
import GenerateCodes from "./GenerateCodes";
import StudentList from "./StudentList";
import PendingCandidates from "./PendingCandidates";
import GasDistribution from "./GasDistribution";

import { AuthContext } from "../../context/AuthContextValue";
import { useBalance } from "../../hooks/useBalance";

const ADMIN_TABS = [
  { id: "controls", label: "Controls", icon: "⚙️" },
  { id: "voters", label: "Voters", icon: "👥" },
  { id: "gas", label: "Funds", icon: "⛽" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("controls");
  const [mainStuck, setMainStuck] = useState(false);
  const mainSentinelRef = useRef(null);
  const { wallet } = useContext(AuthContext);
  const { balance } = useBalance(wallet);

  useEffect(() => {
    const el = mainSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setMainStuck(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      {/* header card */}
      <div className="rounded-xl border border-app bg-app-surface">
        <div className="px-6 py-5 border-b border-app flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-accent-soft text-xl">🛡️</span>
            <div>
              <h2 className="text-2xl font-bold text-app-heading">Admin Dashboard</h2>
              <p className="text-base text-app-muted-text mt-0.5">Manage election phases, voters, and funds</p>
            </div>
          </div>
          {balance && (
            <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-muted/30 px-5 py-2.5">
              <svg className="h-5 w-5 shrink-0 text-app-heading" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 12.5l8 3.5 8-3.5L12 2z" opacity="0.6" />
                <path d="M12 16.5l-8-3.5L12 22l8-9-8 3.5z" />
              </svg>
              <span className="text-lg font-mono font-semibold text-app-heading">{Number(balance).toFixed(4)} ETH</span>
            </div>
          )}
        </div>

        {balance !== null && Number(balance) < 0.05 && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
            <p className="text-base text-rose-400 font-medium">Low balance — {Number(balance).toFixed(4)} ETH</p>
          </div>
        )}

        <div ref={mainSentinelRef} className="h-px" />
        <div className={`flex gap-2 pt-5 pb-3 overflow-x-auto sticky top-20 z-30 transition-all duration-200 ${mainStuck ? "bg-app-surface/80 backdrop-blur-sm shadow-sm" : "bg-transparent"} -mx-6 px-6`}>
          {ADMIN_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? "text-app-accent bg-app-accent-soft shadow-sm"
                  : "text-app-muted-text hover:text-app-heading hover:bg-app-muted/30"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-6">
          {tab === "controls" && <ElectionControl />}
          {tab === "voters" && (
            <VoterSection />
          )}
          {tab === "gas" && <GasDistribution />}
        </div>
      </div>
    </div>
  );
}

function VoterSection() {
  const [subTab, setSubTab] = useState("verify");
  const [subStuck, setSubStuck] = useState(false);
  const subSentinelRef = useRef(null);

  useEffect(() => {
    const el = subSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setSubStuck(!entry.isIntersecting),
      { rootMargin: "-160px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const subTabs = [
    { id: "verify", label: "Verify Voters", icon: "✓" },
    { id: "codes", label: "Registration Codes", icon: "🔑" },
    { id: "candidates", label: "Candidates", icon: "🏆" },
    { id: "students", label: "Student Registry", icon: "🎓" },
  ];

  return (
    <div>
      <div ref={subSentinelRef} className="h-px" />
      <div className={`flex gap-3 mb-6 pb-5 border-b border-app overflow-x-auto sticky top-[10rem] z-20 transition-all duration-200 ${subStuck ? "bg-app-background/80 backdrop-blur-sm" : "bg-transparent"} -mx-6 px-6`}>
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-base font-semibold transition-all cursor-pointer whitespace-nowrap ${
              subTab === t.id
                ? "text-app-accent bg-app-accent-soft shadow-sm"
                : "text-app-muted-text hover:text-app-heading hover:bg-app-muted/30"
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "verify" && <VerifyVoter onWhitelisted={() => setSubTab("students")} />}
      {subTab === "codes" && <GenerateCodes />}
      {subTab === "candidates" && <PendingCandidates />}
      {subTab === "students" && <StudentList />}
    </div>
  );
}
