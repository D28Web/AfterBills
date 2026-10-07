import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { formatMoney } from '@/lib/money';
import { getMortgageSummary, generateMortgageInsights, formatTerm } from '@/lib/mortgageCalculations';
import MortgageOverpaymentPlanner from './MortgageOverpaymentPlanner';
import MortgageRateScenarios from './MortgageRateScenarios';
import BalanceReconciliationEditor from './BalanceReconciliationEditor';
import {
  Home, PoundSterling, TrendingDown, Percent, CalendarClock,
  PiggyBank, Gauge, AlertTriangle, Lightbulb,
} from 'lucide-react';
import DisclaimerBlock from '@/components/disclaimers/DisclaimerBlock';
import { MAIN_DISCLAIMER } from '@/lib/disclaimers';

const ICON_MAP = {
  CalendarClock, TrendingDown, Percent, PoundSterling, TrendingUp: AlertTriangle,
};

/**
 * Detailed mortgage breakdown dialog with projections, overpayment planner,
 * rate scenarios, and balance reconciliation.
 */
export default function MortgageDetailDialog({ bill, open, onOpenChange, currency = '£', onUpdateBill }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!bill) return null;
  const s = getMortgageSummary(bill);
  const insights = generateMortgageInsights(bill, s);
  const fmt = (n) => formatMoney(n, { currency, decimals: n >= 1000 ? 0 : 2 });

  const handleApplyOverpayment = (extraMonthly) => {
    if (!onUpdateBill) return;
    onUpdateBill(bill.id, {
      overpayment_amount: extraMonthly,
      overpayment_frequency: 'monthly',
    });
  };

  const handleReconciliationChange = (history) => {
    if (!onUpdateBill) return;
    // The most recent reconciliation becomes the current balance
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];
    const updates = { balance_reconciliation_history: history };
    if (latest) {
      updates.remaining_balance = latest.balance;
    }
    onUpdateBill(bill.id, updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            {bill.name}
            <span className="text-sm font-normal text-muted-foreground">
              {s.interestTypeLabel || 'Mortgage'}{s.rate ? ` · ${s.rate}%` : ''}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="overpayments" className="text-xs">Overpayments</TabsTrigger>
            <TabsTrigger value="rates" className="text-xs">Rate Scenarios</TabsTrigger>
            <TabsTrigger value="reconcile" className="text-xs">Reconcile</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <DisclaimerBlock text={MAIN_DISCLAIMER} />

            {/* Progress */}
            {s.originalBalance > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{fmt(s.capitalRepaid)} repaid ({s.percentRepaid.toFixed(1)}%)</span>
                  <span className="font-medium text-foreground">{fmt(s.balance)} remaining</span>
                </div>
                <Progress value={Math.min(100, s.percentRepaid)} className="h-2.5" />
              </div>
            )}

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Metric icon={PoundSterling} label="Outstanding balance" value={fmt(s.balance)} />
              <Metric icon={Gauge} label="Original borrowed" value={s.originalBalance > 0 ? fmt(s.originalBalance) : '—'} />
              <Metric icon={PoundSterling} label="Monthly payment" value={formatMoney(s.payment, { currency, decimals: 2 })} />
              <Metric icon={Percent} label="Interest rate" value={s.rate ? `${s.rate}%` : '—'} />
              <Metric icon={CalendarClock} label="Term remaining" value={s.remainingMonths != null ? formatTerm(s.remainingMonths) : '—'} />
              {s.estimatedPayoffDate && (
                <Metric icon={CalendarClock} label="Est. mortgage-free" value={format(s.estimatedPayoffDate, 'MMM yyyy')} />
              )}
              {s.loanToValue != null && (
                <Metric icon={Home} label="Loan-to-value" value={`${s.loanToValue.toFixed(1)}%`} />
              )}
              {s.equity != null && s.equity > 0 && (
                <Metric icon={PiggyBank} label="Equity" value={fmt(s.equity)} tone="positive" />
              )}
              {s.estimatedRemainingInterest > 0 && (
                <Metric icon={Percent} label="Est. interest remaining" value={fmt(s.estimatedRemainingInterest)} tone="muted" />
              )}
              {s.overpaymentMonthly > 0 && (
                <Metric icon={TrendingDown} label="Current overpayment" value={`${formatMoney(s.overpaymentMonthly, { currency, decimals: 2 })}/mo`} tone="positive" />
              )}
            </div>

            {/* Deal info */}
            {s.deal && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" /> Current Deal
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Deal ends</p>
                    <p className="font-semibold text-foreground">{format(s.deal.dealEndDate, 'd MMM yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deal remaining</p>
                    <p className={`font-semibold ${s.deal.monthsRemaining <= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {formatTerm(s.deal.monthsRemaining)}
                    </p>
                  </div>
                  {s.deal.balanceAtDealEnd != null && (
                    <div>
                      <p className="text-muted-foreground">Est. balance at deal end</p>
                      <p className="font-semibold text-foreground">{fmt(s.deal.balanceAtDealEnd)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ERC info */}
            {s.ercAmount != null && s.ercAmount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                Early repayment charge: {fmt(s.ercAmount)}
                {s.ercPercent != null && ` (${s.ercPercent}% of balance)`}
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> Insights
                </p>
                {insights.map((insight, i) => {
                  const Icon = ICON_MAP[insight.icon] || Lightbulb;
                  const toneClass = insight.tone === 'warning'
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'
                    : insight.tone === 'positive'
                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40'
                    : 'text-muted-foreground bg-muted/40 border-border';
                  return (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${toneClass}`}>
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{insight.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Overpayments Tab */}
          <TabsContent value="overpayments" className="mt-4">
            <MortgageOverpaymentPlanner
              summary={s}
              currency={currency}
              onApplyOverpayment={handleApplyOverpayment}
            />
          </TabsContent>

          {/* Rate Scenarios Tab */}
          <TabsContent value="rates" className="mt-4">
            <MortgageRateScenarios summary={s} currency={currency} />
          </TabsContent>

          {/* Reconciliation Tab */}
          <TabsContent value="reconcile" className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Current Balance</p>
              <p className="text-2xl font-bold font-heading text-foreground">{fmt(s.balance)}</p>
              {s.balanceReconciliationHistory.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last reconciled {format(new Date([...s.balanceReconciliationHistory].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date), 'd MMM yyyy')}
                </p>
              )}
            </div>
            <BalanceReconciliationEditor
              history={s.balanceReconciliationHistory}
              currency={currency}
              onChange={handleReconciliationChange}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  const toneClass = tone === 'positive'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'muted'
    ? 'text-muted-foreground'
    : 'text-foreground';
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className={`text-sm font-semibold leading-tight ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}