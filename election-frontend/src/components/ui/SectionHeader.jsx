export default function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300 shadow-neon-glow">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-app-heading truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm font-mono font-bold uppercase tracking-wide text-app-muted truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
