export default function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300 text-sm">
        {icon}
      </div>
      <h3 className="text-sm font-black uppercase tracking-wider text-app-heading">{title}</h3>
    </div>
  );
}
