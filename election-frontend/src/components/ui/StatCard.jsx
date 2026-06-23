export default function StatCard({ label, value, accent = "default" }) {
  const valueClass = {
    default: "text-app-heading",
    emerald: "text-emerald-400 text-glow-emerald",
    amber: "text-amber-400",
    muted: "text-app-muted",
  }[accent];

  return (
    <div className="glass-panel rounded-2xl border border-app p-4 sm:p-5 text-center shadow-sm">
      <p className={`text-2xl sm:text-3xl font-mono font-black ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs font-mono font-bold uppercase tracking-widest text-app-muted">{label}</p>
    </div>
  );
}