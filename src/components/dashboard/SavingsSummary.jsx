import { PiggyBank } from 'lucide-react';
import { formatMoney, roundMoney, sumMoney } from '@/lib/money';
import { Link } from 'react-router-dom';

// Summary of all savings goals: total saved, total target, progress bar.
export default function SavingsSummary({ goals = [], currency }) {
  const totalCurrent = roundMoney(sumMoney(goals.map(g => parseFloat(g.current_amount) || 0)));
  const totalTarget = roundMoney(sumMoney(goals.map(g => parseFloat(g.target_amount) || 0)));
  const pct = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

  return (
    <Link to="/savings" className="block">
      <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent">
              <PiggyBank className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Savings Goals</h3>
          </div>
          <span className="text-xs text-muted-foreground">{goals.length} {goals.length === 1 ? 'goal' : 'goals'}</span>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No savings goals yet. Create one to start tracking.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold font-heading text-foreground">{formatMoney(totalCurrent, { currency, decimals: 2 })}</span>
              <span className="text-sm text-muted-foreground">of {formatMoney(totalTarget, { currency, decimals: 2 })}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </Link>
  );
}