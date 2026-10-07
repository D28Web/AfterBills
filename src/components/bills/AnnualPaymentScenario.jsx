import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import { format, addMonths } from 'date-fns';
import {
  calculateAnnualComparison,
  modelAnnualPaymentScenario,
  isEligibleForAnnualComparison,
  getCurrentPaymentMethod,
  getAnnualRenewalDate,
} from '@/lib/annualPayment';
import { FlaskConical, TrendingDown, CalendarClock, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Scenario modelling for switching a bill from monthly to annual.
 * Lets the user test different contribution levels, switch timings,
 * and existing savings balances, then see when the annual payment
 * becomes fully funded and the long-term savings.
 */
export default function AnnualPaymentScenario({ bills, goals, monthlySpare, currency = '£' }) {
  const eligibleBills = useMemo(
    () => (bills || []).filter(b => isEligibleForAnnualComparison(b) && getCurrentPaymentMethod(b) === 'monthly'),
    [bills]
  );

  const [billId, setBillId] = useState(eligibleBills[0]?.id || '');
  const [monthlyContribution, setMonthlyContribution] = useState(50);
  const [switchTiming, setSwitchTiming] = useState('next_renewal');
  const [useExistingSavings, setUseExistingSavings] = useState(0);

  if (eligibleBills.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <FlaskConical className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No eligible bills for scenario modelling. Add annual cost data to a monthly bill to get started.
        </p>
      </div>
    );
  }

  const bill = eligibleBills.find(b => b.id === billId) || eligibleBills[0];
  const comp = calculateAnnualComparison(bill);
  const goal = goals?.find(g => g.id === bill.annual_fund_goal_id);
  const existingBalance = goal ? (parseFloat(goal.current_amount) || 0) : 0;

  const scenario = modelAnnualPaymentScenario(bill, {
    monthlyContribution: parseFloat(monthlyContribution) || 0,
    existingBalance,
    switchTiming,
    useExistingSavings: parseFloat(useExistingSavings) || 0,
  });

  const renewalDate = getAnnualRenewalDate(bill);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold font-heading">Annual Payment Scenario Modeller</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Bill</Label>
          <Select value={billId || bill.id} onValueChange={setBillId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {eligibleBills.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Switch timing</Label>
          <Select value={switchTiming} onValueChange={setSwitchTiming}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="next_renewal">Next renewal</SelectItem>
              <SelectItem value="following_year">Following year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Monthly contribution ({currency})</Label>
          <Input
            type="number"
            step="5"
            value={monthlyContribution}
            onChange={e => setMonthlyContribution(e.target.value)}
          />
        </div>
        <div>
          <Label>Use existing savings ({currency})</Label>
          <Input
            type="number"
            step="10"
            value={useExistingSavings}
            onChange={e => setUseExistingSavings(e.target.value)}
          />
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
            <CalendarClock className="w-3 h-3" /> Funded by
          </div>
          <p className="text-sm font-bold font-heading mt-1">
            {scenario.fundedDate ? format(scenario.fundedDate, 'MMM yyyy') : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isFinite(scenario.monthsToFund) ? `${scenario.monthsToFund} months` : 'Never at this rate'}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
            <TrendingDown className="w-3 h-3" /> Annual saving
          </div>
          <p className="text-sm font-bold font-heading mt-1 text-primary">
            {formatMoney(scenario.annualSaving, { currency, decimals: 0 })}
          </p>
          <p className="text-[10px] text-muted-foreground">per year</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
            <Wallet className="w-3 h-3" /> Disposable impact
          </div>
          <p className="text-sm font-bold font-heading mt-1">
            {formatMoney(parseFloat(monthlyContribution) || 0, { currency, decimals: 0 })}
          </p>
          <p className="text-[10px] text-muted-foreground">less / month</p>
        </div>
        <div className={cn("rounded-lg p-3", scenario.canFundBeforeRenewal ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-amber-50 dark:bg-amber-900/20")}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Before renewal?</div>
          <p className={cn("text-sm font-bold font-heading mt-1", scenario.canFundBeforeRenewal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {scenario.canFundBeforeRenewal ? 'Yes' : 'No'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {scenario.effectiveMonths} months available
          </p>
        </div>
      </div>

      {/* Long-term savings */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-foreground mb-2">Long-term saving projection</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">2 years</p>
            <p className="text-base font-bold font-heading text-primary">{formatMoney(scenario.saving2yr, { currency, decimals: 0 })}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">3 years</p>
            <p className="text-base font-bold font-heading text-primary">{formatMoney(scenario.saving3yr, { currency, decimals: 0 })}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">5 years</p>
            <p className="text-base font-bold font-heading text-primary">{formatMoney(scenario.saving5yr, { currency, decimals: 0 })}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Illustrative only — assumes the annual price stays the same. Future provider prices are estimates unless you have entered a confirmed annual price.
        </p>
      </div>

      {/* Affordability context */}
      {monthlySpare > 0 && (parseFloat(monthlyContribution) || 0) > 0 && (
        <div className={cn(
          "rounded-lg p-2.5 text-xs",
          (parseFloat(monthlyContribution) || 0) <= monthlySpare * 0.5
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
            : (parseFloat(monthlyContribution) || 0) <= monthlySpare
            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
            : "bg-destructive/10 text-destructive"
        )}>
          {parseFloat(monthlyContribution) > monthlySpare
            ? `This contribution exceeds your current spare of ${formatMoney(monthlySpare, { currency, decimals: 0 })}/month. You may prefer to build towards switching the following year.`
            : `This represents ${((parseFloat(monthlyContribution) / monthlySpare) * 100).toFixed(0)}% of your current spare of ${formatMoney(monthlySpare, { currency, decimals: 0 })}/month.`
          }
        </div>
      )}
    </div>
  );
}