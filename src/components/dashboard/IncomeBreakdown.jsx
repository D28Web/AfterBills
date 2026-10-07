import { useState } from 'react';
import { ChevronDown, ChevronUp, PiggyBank } from 'lucide-react';
import { formatMoney, roundMoney, sumMoney } from '@/lib/money';
import { getStreamMonthlyAmount, getEffectiveStreamMonthlyAmount, INCOME_TYPE_LABELS } from '@/lib/income';
import { FREQUENCY_LABELS } from '@/lib/forecast';
import { format } from 'date-fns';

export default function IncomeBreakdown({ incomeStreams, currency }) {
  const [expanded, setExpanded] = useState(false);

  const total = roundMoney(sumMoney(incomeStreams.map(s => getEffectiveStreamMonthlyAmount(s))));

  if (incomeStreams.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Income Breakdown</span>
          <span className="text-xs text-muted-foreground">({incomeStreams.length} {incomeStreams.length === 1 ? 'source' : 'sources'})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-heading text-foreground">{formatMoney(total, { currency, decimals: 2 })}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {incomeStreams.map(stream => {
            const monthly = getEffectiveStreamMonthlyAmount(stream);
            const isIrregular = stream.frequency === 'irregular';
            return (
              <div key={stream.id} className="flex items-center justify-between p-3 text-sm gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{stream.name}</p>
                    {stream.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Primary</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{INCOME_TYPE_LABELS[stream.income_type] || 'Other'}</span>
                    <span>·</span>
                    <span>{FREQUENCY_LABELS[stream.frequency]}</span>
                    {stream.is_variable && <><span>·</span><span className="text-amber-600">Variable</span></>}
                    {stream.next_payment_date && <><span>·</span><span>Next: {format(new Date(stream.next_payment_date), 'd MMM')}</span></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-foreground">{isIrregular ? '—' : `${formatMoney(monthly, { currency, decimals: 2 })}/mo`}</p>
                  <p className="text-xs text-muted-foreground">{formatMoney(stream.amount, { currency, decimals: 2 })} {isIrregular ? 'one-off' : 'per period'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}