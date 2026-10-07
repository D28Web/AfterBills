import { ShieldCheck, HelpCircle, AlertCircle } from 'lucide-react';
import { CONFIDENCE_LABELS } from '@/lib/paydayPlanner';
import { cn } from '@/lib/utils';

const STYLES = {
  mostly_confirmed: {
    icon: ShieldCheck,
    class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30',
  },
  some_estimates: {
    icon: HelpCircle,
    class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
  },
  highly_variable: {
    icon: AlertCircle,
    class: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30',
  },
};

export default function ConfidenceBadge({ confidence }) {
  const config = STYLES[confidence] || STYLES.some_estimates;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap', config.class)}>
      <Icon className="w-2.5 h-2.5" />
      {CONFIDENCE_LABELS[confidence]}
    </span>
  );
}