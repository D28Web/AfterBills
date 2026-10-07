import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { formatMoney } from '@/lib/money';
import { format } from 'date-fns';
import { calculateAnnualFundProgress, getRollingFundContribution, getCurrentPaymentMethod } from '@/lib/annualPayment';
import { PiggyBank, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Progress card for a linked annual-payment fund, shown inside BillCard.
 * Shows current balance, target, required monthly contribution, and
 * whether the fund is on track for the next renewal.
 *
 * When the bill has already been switched to annual (frequency = annually),
 * shows the rolling-fund contribution to keep the next renewal funded.
 */
export default function AnnualFundProgress({ bill, goal, currency = '£', onAddContribution }) {
  if (!goal) return null;

  const isOnAnnual = getCurrentPaymentMethod(bill) === 'annual';
  const rollingContribution = getRollingFundContribution(bill);

  // Rolling fund mode: bill is already annual, fund continues for next renewal
  if (isOnAnnual) {
    const currentAmount = parseFloat(goal.current_amount) || 0;
    const target = parseFloat(goal.target_amount) || rollingContribution * 12;
    const progress = target > 0 ? Math.min(100, (currentAmount / target) * 100) : 0;

    return (
      <div className="mt-3 rounded-lg bg-accent/30 border border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Rolling Annual Fund
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            On annual
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Continue setting aside {formatMoney(rollingContribution, { currency, decimals: 2 })}/month so your next renewal is already funded.
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatMoney(currentAmount, { currency, decimals: 2 })} / {formatMoney(target, { currency, decimals: 2 })}
          </span>
          <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <Input
          type="number"
          placeholder={`Add ${currency}`}
          className="h-7 text-xs"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = parseFloat(e.target.value);
              if (val > 0) {
                onAddContribution?.(goal, val);
                e.target.value = '';
              }
            }
          }}
        />
      </div>
    );
  }

  // Build-towards-annual mode
  const progress = calculateAnnualFundProgress(bill, goal);
  if (!progress) return null;

  return (
    <div className="mt-3 rounded-lg bg-accent/30 border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <PiggyBank className="w-3.5 h-3.5" />
          Annual Payment Fund
        </span>
        {progress.isFullyFunded ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Ready
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
            {progress.monthsUntil != null ? `${progress.monthsUntil} mo to go` : 'Building'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatMoney(progress.currentAmount, { currency, decimals: 2 })} / {formatMoney(progress.annualCost, { currency, decimals: 2 })}
        </span>
        <span className="font-medium text-foreground">{progress.progress.toFixed(0)}%</span>
      </div>
      <Progress value={progress.progress} className="h-1.5" />

      {!progress.isFullyFunded && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted/50 p-1.5">
            <p className="text-[10px] text-muted-foreground">Still needed</p>
            <p className="font-medium text-foreground">{formatMoney(progress.remaining, { currency, decimals: 2 })}</p>
          </div>
          <div className="rounded bg-muted/50 p-1.5">
            <p className="text-[10px] text-muted-foreground">Required / month</p>
            <p className="font-medium text-primary">{formatMoney(progress.requiredMonthly, { currency, decimals: 2 })}</p>
          </div>
        </div>
      )}

      {progress.isFullyFunded && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          You have enough set aside to switch to annual payment at your next renewal.
        </p>
      )}

      {progress.renewalDate && (
        <p className="text-[10px] text-muted-foreground text-center">
          Renewal: {format(progress.renewalDate, 'd MMM yyyy')}
        </p>
      )}

      <Input
        type="number"
        placeholder={`Add ${currency}`}
        className="h-7 text-xs"
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const val = parseFloat(e.target.value);
            if (val > 0) {
              onAddContribution?.(goal, val);
              e.target.value = '';
            }
          }
        }}
      />
    </div>
  );
}