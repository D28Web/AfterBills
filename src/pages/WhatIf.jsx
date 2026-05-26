import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast, billToMonthlyCost } from '@/lib/forecast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { FlaskConical, Plus, X, RotateCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';

export default function WhatIf() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });

  const realIncome = user?.monthly_income || 0;
  const currency = user?.currency || '£';

  const [simIncome, setSimIncome] = useState(null);
  const [extraBills, setExtraBills] = useState([]);
  const [removedBillIds, setRemovedBillIds] = useState([]);

  const effectiveIncome = simIncome !== null ? simIncome : realIncome;
  const activeBills = bills.filter(b => !removedBillIds.includes(b.id));
  const allBills = [...activeBills, ...extraBills];

  const realForecast = useMemo(() => generateForecast(bills, realIncome), [bills, realIncome]);
  const simForecast = useMemo(() => generateForecast(allBills, effectiveIncome), [allBills, effectiveIncome]);

  const chartData = realForecast.map((m, i) => ({
    name: m.shortLabel,
    current: m.remaining,
    simulated: simForecast[i]?.remaining || 0,
  }));

  const simMonthlyBills = allBills.reduce((sum, b) => sum + billToMonthlyCost(b), 0);
  const simRemaining = effectiveIncome - simMonthlyBills;
  const realRemaining = realIncome - bills.reduce((sum, b) => sum + billToMonthlyCost(b), 0);
  const diff = simRemaining - realRemaining;

  const addExtraBill = () => {
    setExtraBills([...extraBills, { id: `extra-${Date.now()}`, name: 'New Bill', amount: 50, due_day: 1, category: 'other', frequency: 'monthly' }]);
  };

  const reset = () => {
    setSimIncome(null);
    setExtraBills([]);
    setRemovedBillIds([]);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name}: {currency}{Math.round(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">What If</h2>
          <p className="text-sm text-muted-foreground mt-1">Simulate changes and see the impact</p>
        </div>
        <Button variant="outline" onClick={reset} className="gap-2 text-sm">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-1">
          <h3 className="text-sm font-semibold font-heading mb-4 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" /> Controls
          </h3>

          <div className="space-y-5">
            <div>
              <Label className="text-xs">Monthly Income</Label>
              <Input
                type="number"
                value={simIncome !== null ? simIncome : realIncome}
                onChange={e => setSimIncome(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
              <Slider
                value={[simIncome !== null ? simIncome : realIncome]}
                onValueChange={v => setSimIncome(v[0])}
                min={0}
                max={Math.max(realIncome * 3, 10000)}
                step={50}
                className="mt-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Simulated Bills</Label>
                <Button variant="ghost" size="sm" onClick={addExtraBill} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {extraBills.map((b, i) => (
                  <div key={b.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Name"
                      value={b.name}
                      onChange={e => {
                        const updated = [...extraBills];
                        updated[i] = { ...b, name: e.target.value };
                        setExtraBills(updated);
                      }}
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      type="number"
                      value={b.amount}
                      onChange={e => {
                        const updated = [...extraBills];
                        updated[i] = { ...b, amount: parseFloat(e.target.value) || 0 };
                        setExtraBills(updated);
                      }}
                      className="h-8 text-xs w-20"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExtraBills(extraBills.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Remove Existing Bills</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {bills.map(b => (
                  <label key={b.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={removedBillIds.includes(b.id)}
                      onChange={e => {
                        setRemovedBillIds(e.target.checked
                          ? [...removedBillIds, b.id]
                          : removedBillIds.filter(id => id !== b.id));
                      }}
                      className="rounded"
                    />
                    <span className="truncate flex-1">{b.name}</span>
                    <span className="text-muted-foreground">{currency}{b.amount}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 md:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold font-heading">Simulated vs Current</h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-bold font-heading">{currency}{realRemaining.toFixed(0)}</p>
            </div>
            <div className="bg-accent rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Simulated</p>
              <p className="text-lg font-bold font-heading">{currency}{simRemaining.toFixed(0)}</p>
            </div>
            <div className={`rounded-xl p-3 ${diff >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              <p className="text-xs text-muted-foreground">Difference</p>
              <p className={`text-lg font-bold font-heading ${diff >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {diff >= 0 ? '+' : ''}{currency}{diff.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="h-64 md:h-72">
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
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${currency}${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="current" name="Current" stroke="hsl(210, 70%, 55%)" fill="url(#currentGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="simulated" name="Simulated" stroke="hsl(168, 56%, 42%)" fill="url(#simGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}