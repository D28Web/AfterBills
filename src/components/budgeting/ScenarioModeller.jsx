import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { modelScenario, BUDGET_CATEGORIES } from '@/lib/budgeting';

export default function ScenarioModeller({ budget, currency = '£' }) {
  const [adjustments, setAdjustments] = useState({});

  const scenario = useMemo(() => modelScenario(budget, adjustments), [budget, adjustments]);

  const categoriesWithAmounts = BUDGET_CATEGORIES.filter(c => (budget.categoryAmounts[c.key] || 0) > 0);

  const setAdjustment = (key, value) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  };

  const reset = () => setAdjustments({});

  const hasAdjustments = Object.values(adjustments).some(v => v !== 0);

  // "What would it take to reach 20% savings?"
  const savingsBucket = budget.bucketBreakdown.find(b => b.label.toLowerCase().includes('saving'));
  const savingsGap = savingsBucket ? Math.max(0, savingsBucket.targetAmount - savingsBucket.amount) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Scenario Modeller</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Test changes without modifying your real data.</p>
        </div>
        {hasAdjustments && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-xs h-7">
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Quick questions */}
      <div className="flex flex-wrap gap-2">
        {savingsGap > 0 && (
          <button
            onClick={() => setAdjustments({ savings: savingsGap })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            What would it take to reach {Math.round(savingsBucket.targetPct * 100)}% savings?
          </button>
        )}
      </div>

      {/* Category sliders */}
      <div className="space-y-4">
        {categoriesWithAmounts.map(cat => {
          const base = budget.categoryAmounts[cat.key] || 0;
          const adj = adjustments[cat.key] || 0;
          const current = base + adj;
          const maxReduction = -base;
          const maxIncrease = base * 2;
          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{cat.label}</span>
                <span className={`text-sm font-semibold ${adj !== 0 ? (adj > 0 ? 'text-amber-600' : 'text-emerald-600') : ''}`}>
                  {formatMoney(current, { currency, decimals: 2 })}
                  {adj !== 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({adj > 0 ? '+' : ''}{formatMoney(adj, { currency, decimals: 2 })})
                    </span>
                  )}
                </span>
              </div>
              <Slider
                value={[adj]}
                min={maxReduction}
                max={maxIncrease}
                step={5}
                onValueChange={(v) => setAdjustment(cat.key, v[0])}
                className="w-full"
              />
            </div>
          );
        })}
      </div>

      {/* Result */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Projected Position</p>
        {scenario.bucketBreakdown.map(bucket => (
          <div key={bucket.key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{bucket.label}</span>
            <div className="flex items-center gap-3">
              <span className="font-medium">{Math.round(bucket.actualPct * 100)}%</span>
              <span className="text-xs text-muted-foreground">target {Math.round(bucket.targetPct * 100)}%</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm border-t border-border pt-2">
          <span className="text-muted-foreground">Surplus</span>
          <span className="font-semibold">{formatMoney(scenario.surplus, { currency, decimals: 2 })}</span>
        </div>
      </div>
    </div>
  );
}