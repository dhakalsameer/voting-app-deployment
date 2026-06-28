import { useState, useContext, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../../context/AuthContextValue";
import WalletButton from "../WalletButton";
import ThemeToggle from "./ThemeToggle";
import { API_URL, SEPOLIA_EXPLORER, CONTRACT_ADDRESS_V3 } from "../../config";

function getImageUrl(imageCid) {
  if (!imageCid) return null;
  if (imageCid.startsWith("local:")) return `${API_URL}/uploads/${imageCid.slice(6)}`;
  if (imageCid.startsWith("http")) return imageCid;
  return `https://ipfs.io/ipfs/${imageCid}`;
}

function VoterAvatar({ student }) {
  if (!student) return null;
  const url = getImageUrl(student.image_cid);
  const initials = (student.name || "?").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="h-8 w-8 rounded-lg overflow-hidden border border-app shrink-0">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-sky-500 text-[10px] font-black text-slate-950">
          {initials}
        </div>
      )}
    </div>
  );
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const drawerVariants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { type: "spring", stiffness: 300, damping: 32 } },
  exit: { x: "100%", transition: { type: "spring", stiffness: 300, damping: 32 } },
};

export default function AppHeader({ onOpenPortal, activeTab, setActiveTab }) {
  const { isAdmin, student, wallet } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const tabs = !wallet
    ? [
        { id: "home", label: "Home" },
        { id: "results", label: "Results" },
        { id: "activity", label: "Activity" },
        { id: "docs", label: "Docs" },
      ]
    : isAdmin
    ? [
        { id: "admin", label: "Admin" },
        { id: "results", label: "Results" },
        { id: "activity", label: "Activity" },
        { id: "docs", label: "Docs" },
      ]
    : [
        { id: "vote", label: "Vote" },
        { id: "results", label: "Results" },
        { id: "activity", label: "Activity" },
        { id: "docs", label: "Docs" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-app bg-app-surface-solid/80 backdrop-blur-md">
      <div className="page-container flex items-center justify-between h-20">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <img
              src="/images/gu-icon.png"
              alt="GU"
              className="h-16 w-16 rounded-md object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-app-heading hidden sm:block">Election</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 ml-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-lg text-lg font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "text-app-accent bg-app-accent-soft"
                    : "text-app-muted-text hover:text-app-heading"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <a
              href={`${SEPOLIA_EXPLORER}/address/${CONTRACT_ADDRESS_V3}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-app-muted-text hover:text-app-accent transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Contract
            </a>
            <ThemeToggle />
            {!isAdmin && wallet && student && (
              <button onClick={onOpenPortal} className="flex items-center gap-2.5 text-lg font-medium text-app-muted-text hover:text-app-heading transition-colors cursor-pointer px-3 py-2">
                <VoterAvatar student={student} />
                <span className="hidden lg:inline truncate max-w-[120px]">{student.name}</span>
              </button>
            )}
            {!isAdmin && (!wallet || !student) && (
              <button onClick={onOpenPortal} className="text-lg font-medium text-app-muted-text hover:text-app-heading transition-colors cursor-pointer px-3 py-2">
                Portal
              </button>
            )}
            <WalletButton />
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-app text-app-muted-text cursor-pointer"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 z-50 h-full w-64 border-l border-app bg-app-surface-solid md:hidden"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-app">
                <span className="text-lg font-bold text-app-heading">Menu</span>
                <button onClick={() => setMenuOpen(false)} className="h-10 w-10 flex items-center justify-center cursor-pointer text-app-muted-text">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3.5 rounded-lg text-lg font-medium transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "text-app-accent bg-app-accent-soft"
                        : "text-app-muted-text hover:text-app-heading"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-app p-5 space-y-3">
                {!isAdmin && wallet && student && (
                  <button onClick={() => { onOpenPortal(); setMenuOpen(false); }} className="flex items-center gap-2.5 w-full text-left px-3 py-3 rounded-lg text-lg font-medium text-app-muted-text hover:text-app-heading cursor-pointer">
                    <VoterAvatar student={student} />
                    <span className="truncate">{student.name}</span>
                  </button>
                )}
                {!isAdmin && (!wallet || !student) && (
                  <button onClick={() => { onOpenPortal(); setMenuOpen(false); }} className="w-full text-left px-3 py-3 rounded-lg text-lg font-medium text-app-muted-text hover:text-app-heading cursor-pointer">
                    Portal
                  </button>
                )}
                <div className="flex items-center justify-between px-1">
                  <span className="text-lg text-app-muted-text">Theme</span>
                  <ThemeToggle />
                </div>
                <a
                  href={`${SEPOLIA_EXPLORER}/address/${CONTRACT_ADDRESS_V3}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 w-full text-left px-3 py-3 rounded-lg text-lg font-medium text-app-muted-text hover:text-app-accent transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Contract
                </a>
                <WalletButton />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
