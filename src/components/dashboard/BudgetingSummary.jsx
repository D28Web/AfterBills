import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/budgeting';
import { ArrowRight, Scale } from 'lucide-react';

const BUCKET_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#64748b'];

export default function BudgetingSummary({ budget, currency = '£' }) {
  if (!budget || budget.monthlyIncome <= 0) return null;

  const { rule, bucketBreakdown } = budget;
  const furthest = [...bucketBreakdown].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
  const hasIssue = furthest && furthest.status !== 'on_target';

  const chartData = bucketBreakdown.map((b, i) => ({
    name: b.label,
    value: b.amount,
    color: BUCKET_COLORS[i] || '#9ca3af',
  }));

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Budgeting Rule</h3>
        </div>
        <Link to="/budgeting" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Full view <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut chart */}
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">{rule.label}</span>
          </div>
        </div>

        {/* Buckets summary */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {bucketBreakdown.map((b, i) => (
            <div key={b.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: BUCKET_COLORS[i] || '#9ca3af' }} />
              <span className="text-xs text-muted-foreground flex-1 truncate">{b.label}</span>
              <span className="text-xs font-medium">{Math.round(b.actualPct * 100)}%</span>
              <span className="text-xs text-muted-foreground w-8 text-right">/ {Math.round(b.targetPct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* One key recommendation */}
      {hasIssue ? (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{furthest.label}</span> is{' '}
            {STATUS_LABELS[furthest.status].toLowerCase()} —{' '}
            {furthest.diff > 0
              ? `${formatMoney(Math.abs(furthest.diff), { currency, decimals: 0 })} over target`
              : `${formatMoney(Math.abs(furthest.diff), { currency, decimals: 0 })} under target`}
            .
          </p>
          <Link to="/budgeting" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-0.5">
            See recommendations <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-emerald-600 font-medium">
            You are within target across all areas of your {rule.label} rule.
          </p>
        </div>
      )}
    </div>
  );
}