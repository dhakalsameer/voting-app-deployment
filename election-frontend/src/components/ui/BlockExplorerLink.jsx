import { SEPOLIA_EXPLORER } from "../../config";

export default function BlockExplorerLink({ hash, type = "tx", label }) {
  const href = `${SEPOLIA_EXPLORER}/${type === "address" ? "address" : "tx"}/${hash}`;
  const display = label || (hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : "");

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200 hover:underline transition-colors"
    >
      {display}
      <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
