import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatMoney } from '@/lib/money';
import { format } from 'date-fns';
import {
  calculateAnnualComparison,
  isEligibleForAnnualComparison,
  getCurrentPaymentMethod,
  getMonthsUntilRenewal,
} from '@/lib/annualPayment';
import { TrendingDown, CalendarClock, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Annual vs monthly comparison card shown inside BillCard when the bill
 * has annual comparison data. Displays the side-by-side comparison,
 * highlights savings, and offers a "Build towards annual" action.
 */
export default function AnnualPaymentComparison({ bill, currency = '£', onCreateFund, onGoToFund }) {
  const [showDetail, setShowDetail] = useState(false);
  const eligible = isEligibleForAnnualComparison(bill);
  if (!eligible) return null;

  const comp = calculateAnnualComparison(bill);
  if (!comp.hasData) return null;

  const currentMethod = getCurrentPaymentMethod(bill);
  const monthsUntil = getMonthsUntilRenewal(bill);
  const hasFund = !!bill.annual_fund_goal_id;

  return (
    <div className="mt-3 rounded-lg bg-muted/40 border border-border p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 shrink-0">
          <TrendingDown className="w-3.5 h-3.5" />
          Annual vs Monthly
        </span>
        {comp.saving > 0 ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 shrink-0">
            Annual saves {formatMoney(comp.saving, { currency, decimals: 0 })}/yr
          </span>
        ) : comp.saving < 0 ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
            Monthly is cheaper
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
            No difference
          </span>
        )}
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(
          "rounded-lg p-2.5 border text-xs min-w-0",
          currentMethod === 'monthly' ? "border-primary/30 bg-primary/5" : "border-border"
        )}>
          <p className="text-muted-foreground font-medium">Pay monthly</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {formatMoney(comp.monthlyCost, { currency, decimals: 2 })}/mo
          </p>
          <p className="text-muted-foreground mt-0.5">
            {formatMoney(comp.monthlyYearlyCost, { currency, decimals: 2 })}/yr
          </p>
          {currentMethod === 'monthly' && (
            <p className="text-[10px] text-primary font-medium mt-1">Current method</p>
          )}
        </div>

        <div className={cn(
          "rounded-lg p-2.5 border text-xs min-w-0",
          currentMethod === 'annual' ? "border-primary/30 bg-primary/5" : "border-border"
        )}>
          <p className="text-muted-foreground font-medium">Pay annually</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {formatMoney(comp.annualCost, { currency, decimals: 2 })}/yr
          </p>
          <p className="text-muted-foreground mt-0.5">
            = {formatMoney(comp.effectiveMonthlyCost, { currency, decimals: 2 })}/mo equiv
          </p>
          {currentMethod === 'annual' && (
            <p className="text-[10px] text-primary font-medium mt-1">Current method</p>
          )}
        </div>
      </div>

      {/* Saving / no saving message */}
      {comp.saving > 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Annual saves {formatMoney(comp.saving, { currency, decimals: 2 })}/year ({comp.percentageSaving}%)
          </span>
        </div>
      ) : comp.saving < 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Annual payment costs {formatMoney(Math.abs(comp.saving), { currency, decimals: 2 })}/year more — monthly is the better option here.</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Both options cost the same — no saving from paying annually.</span>
        </div>
      )}

      {/* Action: build towards annual */}
      {comp.annualCheaper && currentMethod === 'monthly' && (
        <div className="pt-1">
          {hasFund ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={onGoToFund}
            >
              View annual fund
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full text-xs h-7 gap-1.5"
              onClick={onCreateFund}
            >
              <CalendarClock className="w-3 h-3" />
              Build towards annual payment
            </Button>
          )}
        </div>
      )}

      {/* Renewal date */}
      {monthsUntil != null && (
        <p className="text-[10px] text-muted-foreground text-center">
          {monthsUntil > 0
            ? `${monthsUntil} months until renewal${bill.renewal_date ? ` (${format(new Date(bill.renewal_date), 'd MMM yyyy')})` : ''}`
            : 'Renewal is due now'}
        </p>
      )}
    </div>
  );
}