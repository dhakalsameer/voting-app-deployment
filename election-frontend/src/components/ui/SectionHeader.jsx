export default function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-app-accent/30 bg-app-accent/10 text-app-accent text-lg">
        {icon}
      </div>
      <h3 className="text-base font-black uppercase tracking-wider text-app-heading">{title}</h3>
    </div>
  );
}
