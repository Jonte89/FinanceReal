interface AccentCardProps {
  label: string;
  value: string;
  subtitle: React.ReactNode;
  accent: string; // left border colour, e.g. "border-emerald-500"
  valueClass?: string;
}

/** Summary stat card with a coloured left border, shared across pages. */
export function AccentCard({ label, value, subtitle, accent, valueClass }: AccentCardProps) {
  return (
    <div className={`rounded-lg border-l-4 ${accent} bg-white p-4 shadow-sm`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${valueClass ?? "text-slate-800"}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
    </div>
  );
}
