import { useEffect } from "react";
import { createPortal } from "react-dom";

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export default function ConfirmModal({ open, title, message, warning, confirmLabel, confirmClass, onClose, onConfirm }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  if (!open) return null;

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-app bg-app-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black uppercase tracking-wide text-app-heading">{title || "Confirm"}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-app-muted hover:text-app-heading hover:bg-app-muted/30 transition-colors cursor-pointer">
            <CloseIcon />
          </button>
        </div>
        <div className="text-sm text-app-body leading-relaxed whitespace-pre-wrap">{message}</div>
        {warning && (
          <p className="mt-4 text-sm text-rose-400 flex items-start gap-2">
            <WarningIcon />
            <span>{warning}</span>
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-app bg-app-elevated px-4 py-3 text-sm font-bold text-app-heading hover:bg-app-muted/30 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest transition-all cursor-pointer ${confirmClass || "bg-gradient-to-r from-rose-500 to-rose-400 text-white hover:brightness-110"}`}
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
