import { formatMoney } from '@/lib/money';
import { STATUS_TONES } from '@/lib/budgeting';

const TONE_DOT = {
  good: 'bg-emerald-500',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  suggestion: 'bg-primary',
};

export default function RuleComparison({ comparison, currentRule, currency = '£' }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Rule Comparison</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          How your current finances fit each rule. Your selected rule is highlighted.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {comparison.map((rule, i) => {
          const isCurrent = rule.ruleKey === currentRule;
          const isClosest = i === 0;
          return (
            <div
              key={rule.ruleKey}
              className={`rounded-xl border p-4 transition-colors ${
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : isClosest
                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                    : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{rule.label}</span>
                  {isCurrent && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Selected</span>
                  )}
                  {isClosest && !isCurrent && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Closest fit</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Avg {Math.round(rule.avgPctDiff * 100)}% off
                </span>
              </div>
              <div className="space-y-1.5">
                {rule.buckets.map(b => (
                  <div key={b.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${TONE_DOT[STATUS_TONES[b.status]] || 'bg-muted-foreground'}`} />
                      <span className="text-muted-foreground">{b.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{Math.round(b.actualPct * 100)}%</span>
                      <span className="text-muted-foreground">/ {Math.round(b.targetPct * 100)}%</span>
                      {b.diff !== 0 && (
                        <span className={`text-xs ${b.diff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {b.diff > 0 ? '+' : ''}{formatMoney(b.diff, { currency, decimals: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}