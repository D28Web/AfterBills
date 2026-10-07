import { useState, useMemo } from 'react';
import { getAffordabilityStats } from '@/lib/planning';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, AlertTriangle, ShieldCheck, ShieldAlert, CalendarClock, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import MoneyTooltip from '@/components/charts/MoneyTooltip';
import { format } from 'date-fns';

const COMMITMENT_TYPES = [
  { value: 'car_finance', label: 'Car Finance', category: 'loans' },
  { value: 'subscription', label: 'Subscription', category: 'subscriptions' },
  { value: 'insurance', label: 'Insurance', category: 'insurance' },
  { value: 'rent_mortgage', label: 'Rent / Mortgage Increase', category: 'housing' },
  { value: 'loan_repayment', label: 'Loan Repayment', category: 'loans' },
  { value: 'childcare', label: 'Childcare', category: 'other' },
  { value: 'other', label: 'Other', category: 'other' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'four_weekly', label: 'Four-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export default function AffordabilityChecker({ bills, income, primaryCtx, currency = '£', initialData, onRequestSave }) {
  const init = initialData?.commitment;
  const [type, setType] = useState(init?.type || 'car_finance');
  const [name, setName] = useState(init?.name || '');
  const [amount, setAmount] = useState(init?.amount ? String(init.amount) : '');
  const [frequency, setFrequency] = useState(init?.frequency || 'monthly');
  const [startDate, setStartDate] = useState(init?.start_date || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(init?.end_date || '');

  const commitment = useMemo(() => ({
    name: name || COMMITMENT_TYPES.find(t => t.value === type)?.label || 'Commitment',
    amount: parseFloat(amount) || 0,
    frequency,
    start_date: startDate,
    end_date: endDate || null,
    category: COMMITMENT_TYPES.find(t => t.value === type)?.category || 'other',
    type,
  }), [type, name, amount, frequency, startDate, endDate]);

  const stats = useMemo(
    () => getAffordabilityStats({ bills, income, primaryCtx, commitment }),
    [bills, income, primaryCtx, commitment]
  );

  const chartData = stats.realForecast.map((m, i) => ({
    name: m.shortLabel,
    current: m.remaining,
    simulated: stats.simForecast[i]?.remaining || 0,
  }));

  const canSave = parseFloat(amount) > 0;

  const handleSave = () => {
    onRequestSave('affordability', { commitment });
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold font-heading flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Proposed Commitment
          </h3>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!canSave} className="h-7 text-xs gap-1">
            <Save className="w-3 h-3" /> Save
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={v => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMITMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Name</Label>
            <Input placeholder="e.g. New car finance" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End Date (optional)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Test how a recurring commitment affects your forecast. Nothing is saved to your bills unless you apply it.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-2 space-y-4 min-w-0">
        <h3 className="text-sm font-semibold font-heading">Affordability Impact</h3>

        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Wallet className="w-3 h-3" /> Left after bills (monthly)</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-bold font-heading">{formatMoney(stats.realRemaining, { currency, decimals: 2 })}</p>
            </div>
            <div className="bg-accent rounded-xl p-3">
              <p className="text-xs text-muted-foreground">With commitment</p>
              <p className="text-lg font-bold font-heading">{formatMoney(stats.simRemaining, { currency, decimals: 2 })}</p>
            </div>
            <div className={`rounded-xl p-3 ${stats.monthlyImpact >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              <p className="text-xs text-muted-foreground">Monthly impact</p>
              <p className={`text-lg font-bold font-heading ${stats.monthlyImpact >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatSignedMoney(stats.monthlyImpact, { currency, decimals: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Annual impact</p>
            <p className={`text-base font-bold font-heading ${stats.annualImpact >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatSignedMoney(stats.annualImpact, { currency, decimals: 2 })}
            </p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Lowest projected buffer</p>
            <p className={`text-base font-bold font-heading ${stats.lowestBuffer < 0 ? 'text-destructive' : 'text-foreground'}`}>
              {formatMoney(stats.lowestBuffer, { currency, decimals: 2 })}
            </p>
          </div>
        </div>

        <div className={`rounded-xl p-3 flex items-start gap-2 ${stats.hasNegative ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          {stats.hasNegative ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-semibold ${stats.hasNegative ? 'text-destructive' : 'text-primary'}`}>
              {stats.hasNegative ? `${stats.negativeMonthsCount} forecast month(s) turn negative` : 'No forecast period turns negative'}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.hasNegative ? 'This commitment would push your balance below zero in some months.' : 'Your buffer stays above zero across the 12-month forecast.'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Effect on upcoming pay cycles (Safe to Spend)</p>
          <div className="space-y-1.5">
            {stats.cycleEffects.map(ce => (
              <div key={ce.index} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">{ce.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{formatMoney(ce.realSpare, { currency, decimals: 2 })}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={`font-semibold ${ce.simSpare < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatMoney(ce.simSpare, { currency, decimals: 2 })}
                  </span>
                  <span className="text-destructive">{formatSignedMoney(-ce.commitTotal, { currency, decimals: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">12-month forecast</p>
          <div className="h-56 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="affCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="affSim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(168, 56%, 42%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(168, 56%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v, { currency })} />
                <Tooltip content={<MoneyTooltip currency={currency} />} />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(0, 72%, 58%)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="current" name="Current" stroke="hsl(210, 70%, 55%)" fill="url(#affCurrent)" strokeWidth={2} />
                <Area type="monotone" dataKey="simulated" name="With commitment" stroke="hsl(168, 56%, 42%)" fill="url(#affSim)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
}