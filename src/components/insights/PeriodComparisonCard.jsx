import { useState } from 'react';
import { ArrowUp, ArrowDown, Minus, BarChart3 } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const METRIC_ROWS = [
  { key: 'income', label: 'Income' },
  { key: 'regularBills', label: 'Bills' },
  { key: 'debt', label: 'Debt repayments' },
  { key: 'sinkingFunds', label: 'Sinking funds' },
  { key: 'leftAfterBills', label: 'Left after bills' },
  { key: 'savings', label: 'Left for savings' },
];

function DeltaBadge({ delta, currency }) {
  if (Math.abs(delta) < 1) {
    return <span className="inline-flex items-center text-muted-foreground text-xs"><Minus className="w-3 h-3" />{formatMoney(0, { currency, decimals: 0 })}</span>;
  }
  const up = delta > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {formatMoney(Math.abs(delta), { currency, decimals: 0 })}
    </span>
  );
}

export default function PeriodComparisonCard({ comparisons, currency = '£' }) {
  const { previous, next, cycle, lastYear, hasHistory } = comparisons;
  const tabs = [
    { id: 'prev', label: 'vs Last Month', data: previous },
    { id: 'next', label: 'vs Next Month', data: next },
    { id: 'cycle', label: 'vs Last Cycle', data: cycle, disabled: !cycle },
    { id: 'lastYear', label: 'vs Last Year', data: lastYear, disabled: !hasHistory },
  ].filter(t => t.data || t.disabled);

  const [active, setActive] = useState(tabs.find(t => t.data)?.id || tabs[0]?.id);
  const activeTab = tabs.find(t => t.id === active) || tabs.find(t => t.data);

  if (!activeTab || !activeTab.data) {
    return null;
  }

  const { current, metrics: compared, highlights, currentLabel, comparedLabel } = activeTab.data;
  const topHighlights = highlights.slice(0, 4);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold font-heading">Period Comparison</h3>
          <p className="text-xs text-muted-foreground">How this period compares</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => setActive(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              tab.disabled && 'opacity-40 cursor-not-allowed',
              active === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {topHighlights.length > 0 ? (
        <div className="space-y-1.5">
          {topHighlights.map(h => (
            <div key={h.key} className="flex items-start gap-2 text-sm">
              <span className={cn('mt-0.5 shrink-0', h.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {h.direction === 'up' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </span>
              <span className="text-foreground leading-snug">{h.sentence}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No meaningful changes between {currentLabel.toLowerCase()} and {comparedLabel.toLowerCase()}.</p>
      )}

      <div className="border-t border-border pt-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium pb-1.5">Metric</th>
              <th className="text-right font-medium pb-1.5">{currentLabel}</th>
              <th className="text-right font-medium pb-1.5">{comparedLabel}</th>
              <th className="text-right font-medium pb-1.5">Change</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map(row => (
              <tr key={row.key} className="border-t border-border/60">
                <td className="py-1.5 text-muted-foreground">{row.label}</td>
                <td className="py-1.5 text-right font-medium">{formatMoney(current[row.key], { currency, decimals: 0 })}</td>
                <td className="py-1.5 text-right text-muted-foreground">{formatMoney(compared[row.key], { currency, decimals: 0 })}</td>
                <td className="py-1.5 text-right"><DeltaBadge delta={current[row.key] - compared[row.key]} currency={currency} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}