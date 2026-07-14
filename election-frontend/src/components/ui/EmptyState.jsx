export default function EmptyState({ message, icon = "📭" }) {
  return (
    <div className="rounded-2xl border border-dashed border-app bg-app-muted/50 p-8 sm:p-10 text-center">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <p className="mt-3 text-base font-mono text-app-muted">{message}</p>
    </div>
  );
}
