interface SummaryCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  valueClassName: string;
}

export function SummaryCard({
  label,
  value,
  subtitle,
  valueClassName,
}: SummaryCardProps): JSX.Element {
  return (
    <div className="min-w-[190px] rounded-[24px] border border-border bg-gradient-to-br from-white to-brand px-4 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs uppercase tracking-[0.24em] text-secondary">{label}</p>
      <p className={`mt-3 text-3xl font-extrabold ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-xs text-secondary">{subtitle}</p>
    </div>
  );
}
