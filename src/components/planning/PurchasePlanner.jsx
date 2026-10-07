import { useState, useMemo } from 'react';
import { getPurchaseStats } from '@/lib/planning';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, ShoppingBag, CalendarClock, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInCalendarMonths, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PurchasePlanner({ bills, income, primaryCtx, currency = '£', initialData, onRequestSave }) {
  const init = initialData?.purchase;
  const [name, setName] = useState(init?.name || '');
  const [targetCost, setTargetCost] = useState(init?.target_cost ? String(init.target_cost) : '');
  const [targetDate, setTargetDate] = useState(init?.target_date || '');
  const [allocated, setAllocated] = useState(init?.allocated ? String(init.allocated) : '0');

  const purchase = useMemo(() => ({
    name: name || 'Large Purchase',
    target_cost: parseFloat(targetCost) || 0,
    target_date: targetDate || null,
    allocated: parseFloat(allocated) || 0,
  }), [name, targetCost, targetDate, allocated]);

  const stats = useMemo(
    () => getPurchaseStats({ bills, income, primaryCtx, purchase }),
    [bills, income, primaryCtx, purchase]
  );

  const canSave = parseFloat(targetCost) > 0 && targetDate;

  const handleSave = () => {
    onRequestSave('purchase', { purchase });
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold font-heading flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" /> Purchase Plan
          </h3>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!canSave} className="h-7 text-xs gap-1">
            <Save className="w-3 h-3" /> Save
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Purchase Name</Label>
            <Input placeholder="e.g. New car, holiday, appliance" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Target Cost</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={targetCost} onChange={e => setTargetCost(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Target Date</Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Already Allocated</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={allocated} onChange={e => setAllocated(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Projects the contribution needed to fund this purchase by your target date, based on your current forecast.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-2 space-y-4">
        <h3 className="text-sm font-semibold font-heading">Purchase Projection</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Amount remaining</p>
            <p className="text-lg font-bold font-heading">{formatMoney(stats.remaining, { currency, decimals: 2 })}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Months until target</p>
            <p className="text-lg font-bold font-heading">{stats.monthsUntilTarget}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-accent rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Required per month</p>
            <p className="text-xl font-bold font-heading text-primary">{formatMoney(stats.requiredMonthly, { currency, decimals: 2 })}</p>
          </div>
          <div className="bg-accent rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Required per pay cycle</p>
            <p className="text-xl font-bold font-heading text-primary">{formatMoney(stats.requiredPerCycle, { currency, decimals: 2 })}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Impact on left after bills</p>
            <p className="text-base font-bold font-heading">
              {formatMoney(stats.monthlySpare, { currency, decimals: 2 })} → {formatMoney(stats.leftAfterPurchase, { currency, decimals: 2 })}
            </p>
            <p className={`text-xs mt-1 ${stats.leftAfterPurchase < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatSignedMoney(-stats.requiredMonthly, { currency, decimals: 2 })} / month
            </p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Earliest achievable</p>
            {stats.earliestDate ? (
              <>
                <p className="text-base font-bold font-heading">{format(stats.earliestDate, 'MMM yyyy')}</p>
                <p className="text-xs text-muted-foreground mt-1">At current spare {formatMoney(stats.monthlySpare, { currency, decimals: 2 })}/mo</p>
              </>
            ) : (
              <p className="text-xs text-destructive">No spare income to fund this</p>
            )}
          </div>
        </div>

        <div className={`rounded-xl p-3 flex items-start gap-2 ${stats.leftAfterPurchase < 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          {stats.leftAfterPurchase < 0 ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-semibold ${stats.leftAfterPurchase < 0 ? 'text-destructive' : 'text-primary'}`}>
              {stats.leftAfterPurchase < 0
                ? 'This contribution exceeds your spare income'
                : stats.affordable ? 'Affordable at your current pace' : 'Within your spare income'}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.leftAfterPurchase < 0
                ? 'Consider a later target date or a lower cost.'
                : `You would still have ${formatMoney(stats.leftAfterPurchase, { currency, decimals: 2 })}/month left after saving.`}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Compare alternative target dates</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stats.alternatives.map(alt => {
              const isChosen = targetDate && differenceInCalendarMonths(alt.date, startOfMonth(new Date())) === stats.monthsUntilTarget;
              return (
                <div key={alt.months} className={cn(
                  'rounded-xl p-3 border text-center transition-colors',
                  isChosen ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                )}>
                  <p className="text-xs text-muted-foreground">{alt.months} months</p>
                  <p className="text-sm font-bold font-heading mt-0.5">{formatMoney(alt.requiredMonthly, { currency, decimals: 2 })}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{format(alt.date, 'MMM yyyy')}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}