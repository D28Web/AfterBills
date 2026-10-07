import { Target } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { getEmergencyFundStats } from '@/lib/emergencyFund';
import { Link } from 'react-router-dom';

// Emergency fund progress: current vs target, months covered.
export default function EmergencyFundSummary({ goal, bills, monthlySpare, primaryCtx, currency }) {
  if (!goal) {
    return (
      <Link to="/savings" className="block">
        <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-accent">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Emergency Fund</h3>
          </div>
          <p className="text-sm text-muted-foreground">No emergency fund set up. Create one to track your safety net.</p>
        </div>
      </Link>
    );
  }

  const stats = getEmergencyFundStats(goal, bills, monthlySpare, primaryCtx);

  return (
    <Link to="/savings" className="block">
      <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Emergency Fund</h3>
          </div>
          <span className="text-xs text-muted-foreground">{stats.monthsCovered} months covered</span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-heading text-foreground">{formatMoney(stats.current, { currency, decimals: 2 })}</span>
          <span className="text-sm text-muted-foreground">of {formatMoney(stats.target, { currency, decimals: 2 })}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${stats.pctComplete}%` }} />
        </div>
      </div>
    </Link>
  );
}