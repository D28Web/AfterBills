import { formatMoney } from '@/lib/money';
import { STATUS_LABELS, STATUS_TONES } from '@/lib/budgeting';

const TONE_STYLES = {
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  suggestion: 'bg-primary/10 text-primary border-primary/20',
};

export default function BudgetBucketCard({ bucket, currency = '£' }) {
  const tone = STATUS_TONES[bucket.status];
  const pctWidth = Math.min(100, bucket.actualPct * 100);
  const targetWidth = bucket.targetPct * 100;
  const isOver = bucket.diff > 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="font-semibold text-sm">{bucket.label}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target {Math.round(bucket.targetPct * 100)}% · {formatMoney(bucket.targetAmount, { currency, decimals: 2 })}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TONE_STYLES[tone] || ''}`}>
          {STATUS_LABELS[bucket.status]}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold font-heading">{formatMoney(bucket.amount, { currency, decimals: 2 })}</span>
        <span className="text-sm text-muted-foreground">{Math.round(bucket.actualPct * 100)}% of income</span>
      </div>

      {/* Progress bar: actual vs target */}
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pctWidth}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
          style={{ left: `${Math.min(targetWidth, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-muted-foreground">
          {isOver ? `${formatMoney(Math.abs(bucket.diff), { currency, decimals: 2 })} over target` : 'Within target'}
        </span>
        {!isOver && bucket.diff < 0 && (
          <span className="text-muted-foreground">
            {formatMoney(Math.abs(bucket.diff), { currency, decimals: 2 })} under target
          </span>
        )}
      </div>
    </div>
  );
}