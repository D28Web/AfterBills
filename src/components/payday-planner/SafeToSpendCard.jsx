import { Wallet, CalendarClock, CalendarDays, Info } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import ConfidenceBadge from './ConfidenceBadge';

export default function SafeToSpendCard({ data, currency = '£' }) {
  if (!data) return null;
  return (
    <div className="bg-card rounded-2xl border border-primary/30 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading">Safe to Spend</h3>
            <p className="text-[11px] text-muted-foreground">Until next payday · {data.cycleDays} days</p>
          </div>
        </div>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      <p className="text-3xl font-bold font-heading text-primary">
        {formatMoney(data.amountLeft, { currency, decimals: 2 })}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-muted/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider">
            <CalendarClock className="w-3 h-3" /> Per week
          </div>
          <p className="text-lg font-bold font-heading mt-0.5">{formatMoney(data.perWeekAvailable, { currency, decimals: 2 })}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider">
            <CalendarDays className="w-3 h-3" /> Per day
          </div>
          <p className="text-lg font-bold font-heading mt-0.5">{formatMoney(data.perDayAvailable, { currency, decimals: 2 })}</p>
        </div>
      </div>

      <div className="flex items-start gap-1.5 mt-3 text-[11px] text-muted-foreground">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>Planning figure based on your forecast — not your actual bank balance.</span>
      </div>
    </div>
  );
}