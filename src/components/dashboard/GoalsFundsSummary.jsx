import { PiggyBank, Target } from 'lucide-react';
import { formatMoney, roundMoney, sumMoney } from '@/lib/money';
import { getEmergencyFundStats } from '@/lib/emergencyFund';
import { Link } from 'react-router-dom';

// Compact 3-card row consolidating Savings Goals, Emergency Fund, and
// Sinking Funds into a single Dashboard section. Each card links to its
// full feature page. Detailed views remain on those pages.
export default function GoalsFundsSummary({ goals = [], emergencyGoal, sinkingFunds = [], bills, monthlySpare, primaryCtx, currency }) {
  const regularGoals = goals.filter(g => !g.is_emergency_fund);
  const savingsCurrent = roundMoney(sumMoney(regularGoals.map(g => parseFloat(g.current_amount) || 0)));
  const savingsTarget = roundMoney(sumMoney(regularGoals.map(g => parseFloat(g.target_amount) || 0)));
  const savingsPct = savingsTarget > 0 ? Math.min(100, (savingsCurrent / savingsTarget) * 100) : 0;

  const emergencyStats = emergencyGoal
    ? getEmergencyFundStats(emergencyGoal, bills, monthlySpare, primaryCtx)
    : null;

  const activeFunds = sinkingFunds.filter(f => f.status !== 'completed');
  const fundsCurrent = roundMoney(sumMoney(activeFunds.map(f => parseFloat(f.current_amount) || 0)));
  const fundsTarget = roundMoney(sumMoney(activeFunds.map(f => parseFloat(f.target_amount) || 0)));
  const fundsPct = fundsTarget > 0 ? Math.min(100, (fundsCurrent / fundsTarget) * 100) : 0;

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {/* Savings Goals */}
      <Link to="/savings" className="block">
        <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent">
                <PiggyBank className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Savings Goals</h3>
            </div>
            <span className="text-xs text-muted-foreground">{regularGoals.length}</span>
          </div>
          {regularGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl font-bold font-heading text-foreground">{formatMoney(savingsCurrent, { currency, decimals: 2 })}</span>
                <span className="text-xs text-muted-foreground">of {formatMoney(savingsTarget, { currency, decimals: 2 })}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${savingsPct}%` }} />
              </div>
            </>
          )}
        </div>
      </Link>

      {/* Emergency Fund */}
      <Link to="/savings" className="block">
        <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Emergency Fund</h3>
            </div>
            {emergencyStats && <span className="text-xs text-muted-foreground">{emergencyStats.monthsCovered}mo</span>}
          </div>
          {!emergencyGoal ? (
            <p className="text-sm text-muted-foreground">Not set up</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl font-bold font-heading text-foreground">{formatMoney(emergencyStats.current, { currency, decimals: 2 })}</span>
                <span className="text-xs text-muted-foreground">of {formatMoney(emergencyStats.target, { currency, decimals: 2 })}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${emergencyStats.pctComplete}%` }} />
              </div>
            </>
          )}
        </div>
      </Link>

      {/* Sinking Funds */}
      <Link to="/sinking-funds" className="block">
        <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent">
                <PiggyBank className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Sinking Funds</h3>
            </div>
            <span className="text-xs text-muted-foreground">{activeFunds.length} active</span>
          </div>
          {activeFunds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No funds yet</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl font-bold font-heading text-foreground">{formatMoney(fundsCurrent, { currency, decimals: 2 })}</span>
                <span className="text-xs text-muted-foreground">of {formatMoney(fundsTarget, { currency, decimals: 2 })}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${fundsPct}%` }} />
              </div>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}