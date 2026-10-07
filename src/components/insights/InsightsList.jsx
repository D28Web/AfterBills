import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_BY_TONE = {
  good: TrendingUp,
  warn: AlertTriangle,
  info: Lightbulb,
};

const TONE_STYLES = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  info: 'text-primary',
};

export default function InsightsList({ insights = [] }) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-xl bg-primary/10">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold font-heading">Insights</h3>
          <p className="text-xs text-muted-foreground">Observations from your data</p>
        </div>
      </div>
      {insights.map((ins, i) => {
        const Icon = ICON_BY_TONE[ins.tone] || Lightbulb;
        return (
          <div key={i} className="flex items-start gap-2 text-sm">
            <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', TONE_STYLES[ins.tone] || TONE_STYLES.info)} />
            <span className="text-foreground leading-snug">{ins.text}</span>
          </div>
        );
      })}
    </div>
  );
}