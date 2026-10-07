import { useState, useMemo } from 'react';
import { generateForecast, billToMonthlyCost } from '@/lib/forecast';
import { getPayCycles, getBillsInCycle, formatCycleLabel } from '@/lib/payday';
import { formatMoney, formatSignedMoney, sumMoney, roundMoney } from '@/lib/money';
import { FREQ_TO_MONTHLY } from '@/lib/income';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FlaskConical, Plus, X, RotateCcw, CheckCircle2, AlertTriangle, CalendarClock, Wallet, Save } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MoneyTooltip from '@/components/charts/MoneyTooltip';
import UKTaxSettings from '@/components/income/UKTaxSettings';
import { ukTaxBreakdown } from '@/lib/ukTax';
import DisclaimerNotice from '@/components/disclaimers/DisclaimerNotice';
import { MAIN_DISCLAIMER } from '@/lib/disclaimers';

const DEFAULT_TAX_SETTINGS = {
  grossAnnual: '', taxCode: '1257L', studentLoanPlan: 'none', pensionType: 'percent',
  pensionValue: '', pensionIsSalarySacrifice: false, salarySacrificeMonthly: '', otherDeductionsMonthly: '',
};

export default function WhatIfSimulator({ bills, income, primaryCtx, currency = '£', initialData, onRequestSave }) {
  const queryClient = useQueryClient();
  const realIncome = income;

  const [simIncome, setSimIncome] = useState(initialData?.simIncome ?? null);
  const [extraBills, setExtraBills] = useState(
    (initialData?.extraBills || []).map((b, i) => ({ id: `extra-${Date.now()}-${i}`, ...b }))
  );
  const [removedBillIds, setRemovedBillIds] = useState(() => {
    const names = initialData?.removedBillNames || [];
    return names.map(n => bills.find(b => b.name === n)?.id).filter(Boolean);
  });
  const [amountOverrides, setAmountOverrides] = useState(() => {
    const byName = initialData?.amountOverridesByName || {};
    const out = {};
    Object.entries(byName).forEach(([name, amt]) => {
      const b = bills.find(b => b.name === name);
      if (b) out[b.id] = amt;
    });
    return out;
  });
  const [incomeMode, setIncomeMode] = useState(initialData?.incomeMode || 'per_cycle');
  const [taxSettings, setTaxSettings] = useState(initialData?.taxSettings || DEFAULT_TAX_SETTINGS);

  const salaryMonthlyIncome = useMemo(() => {
    const gross = parseFloat(taxSettings.grossAnnual) || 0;
    if (!gross) return 0;
    return ukTaxBreakdown({
      grossAnnual: gross, taxCode: taxSettings.taxCode, studentLoanPlan: taxSettings.studentLoanPlan,
      pensionType: taxSettings.pensionType, pensionValue: parseFloat(taxSettings.pensionValue) || 0,
      pensionIsSalarySacrifice: taxSettings.pensionIsSalarySacrifice,
      salarySacrificeAnnual: (parseFloat(taxSettings.salarySacrificeMonthly) || 0) * 12,
      otherDeductionsAnnual: (parseFloat(taxSettings.otherDeductionsMonthly) || 0) * 12,
    }).takeHomeMonthly;
  }, [taxSettings]);

  const effectiveIncome = incomeMode === 'salary' ? salaryMonthlyIncome : (simIncome !== null ? simIncome : realIncome);

  const activeBills = bills
    .filter(b => !removedBillIds.includes(b.id))
    .map(b => amountOverrides[b.id] != null ? { ...b, amount: amountOverrides[b.id] } : b);
  const allBills = [...activeBills, ...extraBills];

  const realForecast = useMemo(() => generateForecast(bills, realIncome, new Date(), [], primaryCtx), [bills, realIncome, primaryCtx]);
  const simForecast = useMemo(() => generateForecast(allBills, effectiveIncome, new Date(), [], primaryCtx), [allBills, effectiveIncome, primaryCtx]);

  const chartData = realForecast.map((m, i) => ({
    name: m.shortLabel,
    current: m.remaining,
    simulated: simForecast[i]?.remaining || 0,
  }));

  const simMonthlyBills = sumMoney(allBills.map(b => billToMonthlyCost(b)));
  const realMonthlyBills = sumMoney(bills.map(b => billToMonthlyCost(b)));
  const simRemaining = roundMoney(effectiveIncome - simMonthlyBills);
  const realRemaining = roundMoney(realIncome - realMonthlyBills);
  const monthlyDiff = roundMoney(simRemaining - realRemaining);

  const simAnnual = sumMoney(simForecast.map(m => m.remaining));
  const realAnnual = sumMoney(realForecast.map(m => m.remaining));
  const annualDiff = roundMoney(simAnnual - realAnnual);

  const tightestCycle = useMemo(() => {
    if (!effectiveIncome) return null;
    const freq = primaryCtx.pay_frequency || 'monthly';
    const cycleIncome = effectiveIncome / (FREQ_TO_MONTHLY[freq] || 1);
    const cycles = getPayCycles(primaryCtx, 13);
    let tightest = null;
    cycles.forEach((cycle, i) => {
      const cycleBills = getBillsInCycle(allBills, cycle.start, cycle.end);
      const total = roundMoney(cycleBills.reduce((s, b) => s + (b.monthAmount || b.amount), 0));
      const spare = roundMoney(cycleIncome - total);
      if (!tightest || spare < tightest.spare) tightest = { cycle, i, spare, total };
    });
    return tightest;
  }, [allBills, effectiveIncome, primaryCtx]);

  const addExtraBill = () => {
    setExtraBills([...extraBills, { id: `extra-${Date.now()}`, name: 'New Bill', amount: 50, start_date: new Date().toISOString().slice(0, 10), category: 'other', frequency: 'monthly' }]);
  };

  const reset = () => {
    setSimIncome(null); setExtraBills([]); setRemovedBillIds([]); setAmountOverrides({});
    setIncomeMode('per_cycle'); setTaxSettings(DEFAULT_TAX_SETTINGS);
  };

  const hasChanges = extraBills.length > 0 || removedBillIds.length > 0 ||
    Object.keys(amountOverrides).length > 0 || (incomeMode === 'per_cycle' && simIncome !== null && simIncome !== realIncome) ||
    (incomeMode === 'salary' && parseFloat(taxSettings.grossAnnual) > 0);

  const handleSave = () => {
    const data = {
      extraBills: extraBills.map(b => ({ name: b.name, amount: b.amount, frequency: b.frequency, category: b.category, start_date: b.start_date })),
      removedBillNames: removedBillIds.map(id => bills.find(b => b.id === id)?.name).filter(Boolean),
      amountOverridesByName: Object.fromEntries(
        Object.entries(amountOverrides).map(([id, amt]) => {
          const b = bills.find(b => b.id === id);
          return b ? [b.name, amt] : null;
        }).filter(Boolean)
      ),
      incomeMode,
      taxSettings,
      simIncome,
    };
    onRequestSave('what_if', data);
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(removedBillIds.map(id => base44.entities.Bill.delete(id)));
      await Promise.all(
        Object.entries(amountOverrides)
          .filter(([id]) => !removedBillIds.includes(id))
          .map(([id, amount]) => base44.entities.Bill.update(id, { amount }))
      );
      await Promise.all(extraBills.map(b => base44.entities.Bill.create({
        name: b.name, amount: b.amount, start_date: b.start_date, category: b.category,
        frequency: b.frequency, is_recurring: true,
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Simulation applied to your bills');
      reset();
    },
    onError: () => toast.error('Could not apply changes — please try again'),
  });

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold font-heading flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" /> Controls
          </h3>
          <Button variant="ghost" size="sm" onClick={handleSave} className="h-7 text-xs gap-1">
            <Save className="w-3 h-3" /> Save
          </Button>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="text-xs mb-2 block">Income Type</Label>
            <div className="flex gap-2">
              {[
                { value: 'per_cycle', label: 'Monthly income' },
                { value: 'salary', label: 'Annual salary (UK tax)' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setIncomeMode(opt.value)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    incomeMode === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {incomeMode === 'per_cycle' ? (
            <div>
              <Label className="text-xs">Monthly Income</Label>
              <Input type="number" value={simIncome !== null ? simIncome : realIncome}
                onChange={e => setSimIncome(parseFloat(e.target.value) || 0)} className="mt-1" />
              <Slider value={[simIncome !== null ? simIncome : realIncome]} onValueChange={v => setSimIncome(v[0])}
                min={0} max={Math.max(realIncome * 3, 10000)} step={50} className="mt-2" />
            </div>
          ) : (
            <UKTaxSettings taxSettings={taxSettings} onChange={setTaxSettings} payFrequency="monthly" currency={currency} />
          )}

          <div>
            <Label className="text-xs mb-2 block">Adjust Existing Bills</Label>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {bills.map(b => {
                const removed = removedBillIds.includes(b.id);
                const overridden = amountOverrides[b.id] != null;
                return (
                  <div key={b.id} className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 ${removed ? 'opacity-40' : 'hover:bg-muted'}`}>
                    <input type="checkbox" checked={removed}
                      onChange={e => setRemovedBillIds(e.target.checked ? [...removedBillIds, b.id] : removedBillIds.filter(id => id !== b.id))}
                      className="rounded shrink-0" title="Remove from simulation" />
                    <span className="truncate flex-1">{b.name}</span>
                    <Input type="number" disabled={removed} placeholder={String(b.amount)}
                      value={overridden ? amountOverrides[b.id] : ''}
                      onChange={e => {
                        const v = e.target.value;
                        setAmountOverrides(prev => { const next = { ...prev }; if (v === '') delete next[b.id]; else next[b.id] = parseFloat(v) || 0; return next; });
                      }}
                      className={`h-7 w-20 text-xs ${overridden ? 'border-primary' : ''}`} />
                  </div>
                );
              })}
              {bills.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No bills yet</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Add Hypothetical Bills</Label>
              <Button variant="ghost" size="sm" onClick={addExtraBill} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {extraBills.map((b, i) => (
                <div key={b.id} className="flex gap-2 items-center">
                  <Input placeholder="Name" value={b.name}
                    onChange={e => { const updated = [...extraBills]; updated[i] = { ...b, name: e.target.value }; setExtraBills(updated); }}
                    className="h-8 text-xs flex-1" />
                  <Input type="number" value={b.amount}
                    onChange={e => { const updated = [...extraBills]; updated[i] = { ...b, amount: parseFloat(e.target.value) || 0 }; setExtraBills(updated); }}
                    className="h-8 text-xs w-20" />
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setExtraBills(extraBills.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-2 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-heading flex items-center gap-2">
            Simulated vs Current
            <DisclaimerNotice label="Illustrative only" />
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="gap-2 text-xs h-8">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gap-2 text-xs h-8" disabled={!hasChanges || applyMutation.isPending}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Apply
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply simulation to your bills?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently {removedBillIds.length > 0 && `delete ${removedBillIds.length} bill(s), `}
                    {Object.keys(amountOverrides).length > 0 && `update ${Object.keys(amountOverrides).length} bill amount(s), `}
                    {extraBills.length > 0 && `add ${extraBills.length} new bill(s). `}
                    Income changes are not saved here — set those in Settings. This cannot be undone.
                  </AlertDialogDescription>
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 mt-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{MAIN_DISCLAIMER}</p>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                    {applyMutation.isPending ? 'Applying...' : 'Apply changes'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Wallet className="w-3 h-3" /> Monthly left after bills</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-bold font-heading">{formatMoney(realRemaining, { currency })}</p>
            </div>
            <div className="bg-accent rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Simulated</p>
              <p className="text-lg font-bold font-heading">{formatMoney(simRemaining, { currency })}</p>
            </div>
            <div className={`rounded-xl p-3 ${monthlyDiff >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              <p className="text-xs text-muted-foreground">Difference</p>
              <p className={`text-lg font-bold font-heading ${monthlyDiff >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatSignedMoney(monthlyDiff, { currency })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2">Annual disposable income</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-base font-bold font-heading">{formatMoney(realAnnual, { currency })}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Simulated</p>
                <p className={`text-base font-bold font-heading ${annualDiff >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatMoney(simAnnual, { currency })}
                </p>
              </div>
            </div>
            <p className={`text-xs mt-1 ${annualDiff >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatSignedMoney(annualDiff, { currency })} / year
            </p>
          </div>

          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Tightest pay cycle</p>
            {tightestCycle ? (
              <>
                <p className="text-sm font-semibold text-foreground">{formatCycleLabel(tightestCycle.cycle, tightestCycle.i)}</p>
                <p className={`text-base font-bold font-heading ${tightestCycle.spare < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatSignedMoney(tightestCycle.spare, { currency, decimals: 2 })} spare
                </p>
                {tightestCycle.spare < 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> Bills exceed income this cycle
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Set income to see cycle detail</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">12-month forecast</p>
          <div className="h-56 md:h-64 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(168, 56%, 42%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(168, 56%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v, { currency })} />
                <Tooltip content={<MoneyTooltip currency={currency} />} />
                <Legend />
                <Area type="monotone" dataKey="current" name="Current" stroke="hsl(210, 70%, 55%)" fill="url(#currentGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="simulated" name="Simulated" stroke="hsl(168, 56%, 42%)" fill="url(#simGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
}