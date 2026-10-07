import { Trophy, Target, PiggyBank, Shield, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_BY_TYPE = {
  savings: Target,
  sinking: PiggyBank,
  debt: CreditCard,
  emergency: Shield,
};

export default function MilestonesStrip({ milestones = [] }) {
  if (milestones.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {milestones.map((m, i) => {
        const Icon = ICON_BY_TYPE[m.type] || Trophy;
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              m.tone === 'good'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40'
                : 'bg-primary/10 text-primary border-primary/20'
            )}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {m.label}
          </span>
        );
      })}
    </div>
  );
}