import { formatMoney } from '@/lib/money';
import { calculateFinanceTracking } from '@/lib/financeTracking';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import {
  TrendingDown,
  Percent,
  CalendarClock,
  PoundSterling,
  Home,
  PiggyBank,
  AlertTriangle,
  Gauge,
} from 'lucide-react';

// Compact finance tracking summary shown inside the BillCard when a bill
// has finance_type set. Displays balance, progress, interest, and term info.
export default function FinanceTrackingCard({ bill, currency = '£' }) {
  const f = calculateFinanceTracking(bill);
  if (!f) return null;

  const fmt = (n) => formatMoney(n, { currency, decimals: 2 });
  const hasBalance = f.originalBalance > 0 || f.remainingBalance > 0;

  return (
    <div className="mt-3 rounded-lg bg-muted/40 border border-border p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" />
          {f.financeLabel} Tracker
        </span>
        {f.interestRate != null && (
          <span className="text-xs text-muted-foreground">
            {f.interestRate}% {f.interestTypeLabel ? `· ${f.interestTypeLabel}` : f.apr ? `· APR ${f.apr}%` : ''}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {hasBalance && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Repaid</span>
            <span className="font-medium text-foreground">{f.percentRepaid.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(100, f.percentRepaid)} className="h-2" />
        </div>
      )}

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {f.remainingBalance > 0 && (
          <Metric icon={PoundSterling} label="Outstanding" value={fmt(f.remainingBalance)} />
        )}
        {f.capitalRepaid > 0 && (
          <Metric icon={TrendingDown} label="Capital repaid" value={fmt(f.capitalRepaid)} tone="positive" />
        )}
        {f.estimatedInterestPaid > 0 && (
          <Metric icon={Percent} label="Est. interest paid" value={fmt(f.estimatedInterestPaid)} tone="muted" />
        )}
        {f.estimatedRemainingInterest > 0 && (
          <Metric icon={Percent} label="Est. interest left" value={fmt(f.estimatedRemainingInterest)} tone="muted" />
        )}
        {f.remainingTermMonths != null && (
          <Metric icon={CalendarClock} label="Term left" value={`${f.remainingTermMonths} mo`} />
        )}
        {f.estimatedPayoffDate && (
          <Metric icon={CalendarClock} label="Est. payoff" value={format(f.estimatedPayoffDate, 'MMM yyyy')} />
        )}
        {f.balloonPayment != null && (
          <Metric icon={AlertTriangle} label="Balloon payment" value={fmt(f.balloonPayment)} tone="warning" />
        )}
        {f.loanToValue != null && (
          <Metric icon={Home} label="Loan-to-value" value={`${f.loanToValue.toFixed(1)}%`} />
        )}
        {f.equity != null && f.equity > 0 && (
          <Metric icon={PiggyBank} label="Equity" value={fmt(f.equity)} tone="positive" />
        )}
        {f.overpaymentMonthly > 0 && (
          <Metric icon={TrendingDown} label="Overpayment" value={`${fmt(f.overpaymentMonthly)}/mo`} tone="positive" />
        )}
      </div>

      {/* Fixed rate end warning */}
      {f.fixedRateEndDate && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <CalendarClock className="w-3 h-3" />
          Fixed rate ends {format(new Date(f.fixedRateEndDate), 'd MMM yyyy')}
        </div>
      )}

      {/* Early repayment charge */}
      {f.earlyRepaymentChargeAmount != null && f.earlyRepaymentChargeAmount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="w-3 h-3" />
          Early repayment charge: {fmt(f.earlyRepaymentChargeAmount)}
          {f.earlyRepaymentChargeType === 'percentage' && ` (${f.earlyRepaymentCharge}% of balance)`}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  const toneClass = tone === 'positive'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warning'
    ? 'text-amber-600 dark:text-amber-400'
    : tone === 'muted'
    ? 'text-muted-foreground'
    : 'text-foreground';

  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-[10px] leading-tight">{label}</p>
        <p className={`font-medium text-xs leading-tight ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}