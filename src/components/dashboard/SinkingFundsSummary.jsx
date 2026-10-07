import { PiggyBank } from 'lucide-react';
import { formatMoney, roundMoney, sumMoney } from '@/lib/money';
import { Link } from 'react-router-dom';

// Summary of active sinking funds: total saved, total target, progress bar.
export default function SinkingFundsSummary({ sinkingFunds = [], currency }) {
  const active = sinkingFunds.filter(f => f.status !== 'completed');
  const totalCurrent = roundMoney(sumMoney(active.map(f => parseFloat(f.current_amount) || 0)));
  const totalTarget = roundMoney(sumMoney(active.map(f => parseFloat(f.target_amount) || 0)));
  const pct = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

  return (
    <Link to="/sinking-funds" className="block">
      <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent">
              <PiggyBank className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Sinking Funds</h3>
          </div>
          <span className="text-xs text-muted-foreground">{active.length} active</span>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sinking funds yet. Create one to save for upcoming expenses.</p>
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