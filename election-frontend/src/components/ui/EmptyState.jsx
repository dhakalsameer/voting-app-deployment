export default function EmptyState({ message, icon = "📭" }) {
  return (
    <div className="rounded-2xl border border-dashed border-app bg-app-muted/50 p-6 sm:p-8 text-center">
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <p className="mt-2 text-xs font-mono text-app-muted">{message}</p>
    </div>
  );
}
