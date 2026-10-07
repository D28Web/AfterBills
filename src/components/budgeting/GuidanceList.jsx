import { CheckCircle2, Info, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

const TONE_CONFIG = {
  good: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900' },
  info: { icon: Info, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-900' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900' },
  suggestion: { icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
};

export default function GuidanceList({ guidance = [], onAction }) {
  if (guidance.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Add your income and bills to see personalised budgeting guidance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {guidance.map((item, i) => {
        const config = TONE_CONFIG[item.tone] || TONE_CONFIG.info;
        const Icon = config.icon;
        return (
          <div key={i} className={`flex gap-3 rounded-xl border p-4 ${config.bg} ${config.border}`}>
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
              {item.action && (
                <button
                  onClick={() => onAction?.(item.action)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {item.action.label}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}