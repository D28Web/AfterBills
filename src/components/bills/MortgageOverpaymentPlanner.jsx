import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, roundMoney } from '@/lib/money';
import { overpaymentScenario, amortize, formatTerm } from '@/lib/mortgageCalculations';
import { AlertTriangle, TrendingDown, CalendarClock, PoundSterling, Zap } from 'lucide-react';

const PRESETS = [25, 50, 100];

/**
 * Overpayment scenario planner for mortgages.
 * Lets users test extra monthly payments and lump sums without auto-applying.
 */
export default function MortgageOverpaymentPlanner({ summary, currency = '£', onApplyOverpayment }) {
  const [extraMonthly, setExtraMonthly] = useState(50);
  const [lumpSum, setLumpSum] = useState(0);
  const [customExtra, setCustomExtra] = useState('');

  const { balance, rate, payment, annualOverpaymentAllowance } = summary;
  const hasData = balance > 0 && rate > 0 && payment > 0;

  if (!hasData) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Add a balance, interest rate, and payment to model overpayments.</p>;
  }

  const effectiveExtra = customExtra !== '' ? parseFloat(customExtra) || 0 : extraMonthly;
  const scenario = overpaymentScenario(balance, rate, payment, effectiveExtra, lumpSum);
  const base = amortize(balance, rate, payment);

  // Chart data: base vs scenario balance over time
  const maxLen = Math.max(base.schedule.length, scenario.schedule.length);
  const chartData = [];
  for (let i = 0; i <= Math.min(maxLen, 360); i += Math.max(1, Math.floor(maxLen / 60))) {
    const basePoint = base.schedule[i] || base.schedule[base.schedule.length - 1];
    const scenPoint = scenario.schedule[i] || scenario.schedule[scenario.schedule.length - 1];
    if (basePoint || scenPoint) {
      chartData.push({
        label: format(i === 0 ? new Date() : new Date(new Date().getFullYear(), new Date().getMonth() + i), 'MMM yy'),
        base: basePoint ? roundMoney(basePoint.balance) : 0,
        scenario: scenPoint ? roundMoney(scenPoint.balance) : 0,
      });
    }
  }

  const annualExtra = effectiveExtra * 12;
  const exceedsAllowance = annualOverpaymentAllowance != null && annualExtra > annualOverpaymentAllowance;

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div>
        <Label className="text-xs mb-1.5 block">Extra per month</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => { setExtraMonthly(amt); setCustomExtra(''); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                customExtra === '' && extraMonthly === amt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              +{formatMoney(amt, { currency, decimals: 0 })}/mo
            </button>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Custom:</span>
            <Input
              type="number"
              step="5"
              placeholder="0"
              value={customExtra}
              onChange={e => setCustomExtra(e.target.value)}
              className="w-20 h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Lump sum */}
      <div>
        <Label className="text-xs mb-1.5 block">One-off lump sum (optional)</Label>
        <Input
          type="number"
          step="100"
          placeholder="0.00"
          value={lumpSum || ''}
          onChange={e => setLumpSum(parseFloat(e.target.value) || 0)}
          className="max-w-[200px]"
        />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <ResultMetric icon={CalendarClock} label="Revised mortgage-free" value={scenario.newPayoffDate ? format(scenario.newPayoffDate, 'MMM yyyy') : '—'} />
        <ResultMetric icon={Zap} label="Time saved" value={scenario.monthsSaved > 0 ? formatTerm(scenario.monthsSaved) : 'No change'} tone="positive" />
        <ResultMetric icon={PoundSterling} label="Interest saved" value={formatMoney(scenario.interestSaved, { currency, decimals: 0 })} tone="positive" />
        <ResultMetric icon={TrendingDown} label="New monthly payment" value={formatMoney(scenario.newMonthlyPayment, { currency, decimals: 2 })} />
      </div>

      {/* Allowance warning */}
      {exceedsAllowance && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This overpayment ({formatMoney(annualExtra, { currency, decimals: 0 })}/yr) exceeds your annual allowance of {formatMoney(annualOverpaymentAllowance, { currency, decimals: 0 })}. Early repayment charges may apply. Check your mortgage agreement.
          </p>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 2 && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="scenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tickFormatter={v => `${currency}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip formatter={v => [formatMoney(v, { currency, decimals: 0 }), 'Balance']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
            <Area type="monotone" dataKey="base" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="url(#baseGrad)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="scenario" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#scenGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-muted-foreground" style={{ borderTop: '2px dashed' }} /> Without overpayment</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary" /> With overpayment</span>
      </div>

      {/* Apply button */}
      {effectiveExtra > 0 && onApplyOverpayment && (
        <div className="pt-1">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => onApplyOverpayment(effectiveExtra)}>
            <TrendingDown className="w-3.5 h-3.5" /> Add £{effectiveExtra}/mo as planned overpayment
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5">This is a test scenario. Applying adds it to your regular overpayment — it does not change your lender's actual payment.</p>
        </div>
      )}
    </div>
  );
}

function ResultMetric({ icon: Icon, label, value, tone }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground';
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className={`text-sm font-semibold leading-tight ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}