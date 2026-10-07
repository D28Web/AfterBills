import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export default function BufferIndicator({ amountLeft, buffer, currency = '£' }) {
  if (!buffer || buffer <= 0) return null;
  const difference = amountLeft - buffer;
  const below = difference < 0;
  return (
    <div className={cn(
      'rounded-2xl border shadow-sm p-5 h-full flex flex-col',
      below
        ? 'bg-red-50/30 border-red-200 dark:bg-red-900/10 dark:border-red-800/30'
        : 'bg-card border-border'
    )}>
      <div className="flex items-center gap-2 mb-3">
        {below
          ? <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
          : <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        <h3 className="text-sm font-semibold font-heading">Financial Buffer</h3>
      </div>
      <p className={cn(
        'text-3xl font-bold font-heading',
        below ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
      )}>
        {formatSignedMoney(difference, { currency, decimals: 2 })}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {below ? 'below your preferred buffer' : 'above your preferred buffer'}
      </p>
      <div className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Forecast left</span>
          <span className="font-medium text-foreground">{formatMoney(amountLeft, { currency, decimals: 2 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Preferred buffer</span>
          <span className="font-medium text-foreground">{formatMoney(buffer, { currency, decimals: 2 })}</span>
        </div>
      </div>
    </div>
  );
}