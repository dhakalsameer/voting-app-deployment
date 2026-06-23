import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContextValue";
import WalletButton from "../WalletButton";
import ThemeToggle from "./ThemeToggle";

function MenuIcon({ open }) {
  if (open) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function AppHeader({ onOpenPortal, activeTab, setActiveTab }) {
  const { isAdmin } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = isAdmin
    ? [
        { id: "admin", label: "Admin Console", icon: "⚙️" },
        { id: "results", label: "Results", icon: "📊" },
        { id: "activity", label: "Live Activity", icon: "⚡" },
        { id: "docs", label: "How It Works", icon: "📘" },
      ]
    : [
        { id: "vote", label: "Vote", icon: "🗳️" },
        { id: "results", label: "Results", icon: "📊" },
        { id: "activity", label: "Live Activity", icon: "⚡" },
        { id: "docs", label: "How It Works", icon: "📘" },
      ];

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-app shadow-card">
      <div className="page-container py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-amber-300 via-emerald-500 to-sky-500 p-2 sm:p-2.5 shadow-neon-glow">
              <span className="text-base sm:text-xl font-black tracking-tighter text-slate-950">IT</span>
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-base sm:text-xl lg:text-2xl font-black uppercase tracking-tight text-app-heading truncate">
                Club Election
                <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400 animate-pulse" />
              </h1>
              <p className="hidden sm:block text-xs sm:text-sm font-bold uppercase tracking-widest text-sky-400/70 font-mono">
                Decentralized Voting System v3
              </p>
            </div>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-1 xl:gap-2 mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm uppercase tracking-wider font-black transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-sky-400/10 text-sky-300 border border-sky-400/25 shadow-neon-glow"
                    : "border border-transparent text-app-muted-text hover:text-app-heading hover:bg-app-muted/60"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            {!isAdmin && (
              <button
                onClick={onOpenPortal}
                className="btn-secondary whitespace-nowrap"
              >
                <span aria-hidden="true">🎓</span>
                Student Portal
              </button>
            )}
            <WalletButton />
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-app-input text-app-accent transition-colors hover:bg-app-elevated cursor-pointer"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-app/60 flex flex-col gap-2 animate-fade-in">
            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-1.5 mb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm uppercase tracking-wider font-black transition-all flex items-center gap-2.5 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-sky-400/10 text-sky-300 border border-sky-400/25"
                      : "border border-transparent text-app-muted-text hover:text-app-heading hover:bg-app-muted"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <hr className="border-app/40 my-1" />

            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-xs font-bold text-app-muted-text uppercase">Theme</span>
              <ThemeToggle />
            </div>
            {!isAdmin && (
              <button
                onClick={() => {
                  onOpenPortal();
                  setMenuOpen(false);
                }}
                className="btn-secondary w-full justify-center"
              >
                <span aria-hidden="true">🎓</span>
                Student Portal
              </button>
            )}
            <div className="flex justify-center py-1">
              <WalletButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
