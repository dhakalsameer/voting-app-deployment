import { createContext, useContext, useState, useCallback } from "react";
import BlockExplorerLink from "./BlockExplorerLink";

const ToastContext = createContext(null);

let toastIdCounter = 0;

function normalizeOptions(arg) {
  if (arg == null) return { duration: 4000 };
  if (typeof arg === "number") return { duration: arg };
  return { duration: arg.duration ?? 4000, txHash: arg.txHash };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", options) => {
    const { duration, txHash } = normalizeOptions(options);
    const id = ++toastIdCounter;
    const toast = { id, message, type, duration, txHash };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message, options) => addToast(message, "success", options),
    [addToast]
  );
  const error = useCallback(
    (message, options) => addToast(message, "error", options),
    [addToast]
  );
  const info = useCallback(
    (message, options) => addToast(message, "info", options),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const typeStyles = {
  success: {
    bg: "bg-emerald-950/90",
    border: "border-emerald-500/30",
    text: "text-emerald-100",
    iconColor: "text-emerald-400",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: "bg-rose-950/90",
    border: "border-rose-500/30",
    text: "text-rose-100",
    iconColor: "text-rose-400",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    bg: "bg-[#0f1c15]/95",
    border: "border-emerald-500/20",
    text: "text-slate-200",
    iconColor: "text-emerald-400",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 sm:top-20 inset-x-4 sm:inset-x-auto sm:right-6 z-[100] flex flex-col gap-3 w-auto sm:max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const style = typeStyles[toast.type] || typeStyles.info;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border backdrop-blur-md ${style.border} ${style.bg} p-4 shadow-card animate-slide-in-right`}
            role="alert"
          >
            <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>{style.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-relaxed ${style.text}`}>{toast.message}</p>
              {toast.txHash && (
                <div className="mt-1.5">
                  <span className="text-xs text-slate-500 mr-1.5">Tx:</span>
                  <BlockExplorerLink hash={toast.txHash} />
                </div>
              )}
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-auto -mt-1 -mr-1 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
