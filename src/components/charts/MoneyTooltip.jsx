import { formatMoney } from '@/lib/money';

/**
 * Shared recharts tooltip for monetary series.
 * Renders each payload entry as `name: <currency><value>` with optional
 * badge content (e.g. a payday marker) and configurable precision.
 */
export default function MoneyTooltip({ active, payload, label, currency = '£', decimals = 0, getBadge }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        {label != null && <p className="text-sm font-semibold text-foreground">{label}</p>}
        {getBadge?.(label)}
      </div>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {formatMoney(p.value, { currency, decimals })}
        </p>
      ))}
    </div>
  );
}