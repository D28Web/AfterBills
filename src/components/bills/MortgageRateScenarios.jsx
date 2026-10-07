import { useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { rateChangeScenario, formatTerm } from '@/lib/mortgageCalculations';
import { CalendarClock, TrendingUp, TrendingDown, Percent, AlertTriangle } from 'lucide-react';

/**
 * Rate-change scenario modeller for mortgage deal expiry planning.
 * Shows the estimated effect of future rates on payment, interest, and term.
 * All figures are clearly labeled as estimates.
 */
export default function MortgageRateScenarios({ summary, currency = '£' }) {
  const { balance, rate, payment, remainingMonths, deal } = summary;
  const [customRate, setCustomRate] = useState('');

  if (!balance || balance <= 0 || !rate || !payment) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Add a balance, interest rate, and payment to model rate scenarios.</p>;
  }

  // Build scenario rates: current, +1%, +2%, -1%
  const scenarioRates = [rate + 1, rate + 2, rate - 0.5, rate - 1].filter(r => r > 0 && r !== rate);
  if (customRate !== '' && parseFloat(customRate) > 0) {
    scenarioRates.push(parseFloat(customRate));
  }

  const scenarios = scenarioRates.map(newRate => rateChangeScenario(balance, rate, newRate, payment, remainingMonths));

  return (
    <div className="space-y-4">
      {/* Deal expiry info */}
      {deal && !deal.isExpired ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarClock className="w-4 h-4 text-primary" />
            {summary.interestTypeLabel || 'Current'} deal ends {format(deal.dealEndDate, 'd MMM yyyy')}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Deal remaining</p>
              <p className="font-semibold text-foreground">{formatTerm(deal.monthsRemaining)}</p>
            </div>
            {deal.balanceAtDealEnd != null && (
              <div>
                <p className="text-muted-foreground">Est. balance at deal end</p>
                <p className="font-semibold text-foreground">{formatMoney(deal.balanceAtDealEnd, { currency, decimals: 0 })}</p>
              </div>
            )}
          </div>
        </div>
      ) : deal?.isExpired ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">Your mortgage deal has ended. You may be on a follow-on rate — consider remortgaging.</p>
        </div>
      ) : null}

      {/* Current rate summary */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Current rate</span>
        <span className="text-sm font-bold font-heading text-foreground">{rate}% · {formatMoney(payment, { currency, decimals: 2 })}/mo</span>
      </div>

      {/* Scenario table */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">If your rate changed to…</p>
        {scenarios.map((s, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{s.newRate}% {s.newRate > rate ? <TrendingUp className="w-3.5 h-3.5 inline text-destructive" /> : <TrendingDown className="w-3.5 h-3.5 inline text-emerald-500" />}</span>
              <span className={`text-xs font-medium ${s.paymentChange > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatSignedMoney(s.paymentChange, { currency, decimals: 2 })}/mo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">New payment</p>
                <p className="font-semibold text-foreground">{formatMoney(s.newPayment, { currency, decimals: 2 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Interest cost</p>
                <p className="font-semibold text-foreground">{formatMoney(s.newTotalInterest, { currency, decimals: 0 })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Term</p>
                <p className="font-semibold text-foreground">{formatTerm(s.remainingMonths)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom rate input */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs mb-1 block">Model a custom rate</Label>
          <Input type="number" step="0.1" placeholder="e.g. 5.5" value={customRate} onChange={e => setCustomRate(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground pb-2">%</span>
      </div>

      <p className="text-xs text-muted-foreground italic">
        These are estimates based on standard amortization. Your actual payment depends on your lender's calculation method. Check with your lender before making decisions.
      </p>
    </div>
  );
}