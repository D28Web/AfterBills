import { useState, useMemo } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Receipt, CreditCard, CalendarDays, PiggyBank, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { getUpcomingCommitments, groupCommitmentsForDisplay, sumCommitments } from '@/lib/upcomingCommitments';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

const PERIODS = [
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

const TYPE_CONFIG = {
  bill: { icon: Receipt, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  debt: { icon: CreditCard, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  annual: { icon: CalendarDays, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  renewal: { icon: RefreshCw, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  sinking_fund: { icon: PiggyBank, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
};

const MAX_ITEMS = 8;

export default function UpcomingCommitments({ bills, sinkingFunds, currency = '£' }) {
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  const periodData = useMemo(
    () => PERIODS.map(p => {
      const events = getUpcomingCommitments(bills, sinkingFunds, p.days);
      return { ...p, events, total: sumCommitments(events) };
    }),
    [bills, sinkingFunds]
  );

  const current = periodData.find(p => p.days === selectedPeriod);
  const displayItems = useMemo(() => groupCommitmentsForDisplay(current.events), [current]);
  const visibleItems = displayItems.slice(0, MAX_ITEMS);
  const hiddenCount = displayItems.length - visibleItems.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-5"
    >
      <h3 className="text-sm font-semibold font-heading mb-4">Upcoming Commitments</h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {periodData.map(p => (
          <button
            key={p.days}
            onClick={() => setSelectedPeriod(p.days)}
            className={cn(
              "rounded-xl p-3 text-left transition-colors border",
              selectedPeriod === p.days
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/50 border-border hover:bg-muted"
            )}
          >
            <p className="text-xs text-muted-foreground">{p.label}</p>
            <p className="text-lg font-bold font-heading mt-0.5">{formatMoney(p.total, { currency, decimals: 2 })}</p>
            <p className="text-xs text-muted-foreground">{p.events.length} {p.events.length === 1 ? 'item' : 'items'}</p>
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No commitments in the next {selectedPeriod} days
        </p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item, i) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.bill;
            const Icon = config.icon;
            const daysAway = differenceInCalendarDays(item.firstDate, new Date());
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(item.firstDate, 'd MMM')}
                    {daysAway === 0 ? ' · Today' : daysAway === 1 ? ' · Tomorrow' : ` · in ${daysAway}d`}
                    {item.count > 1 && ` · ${item.count}×`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0">
                  {formatMoney(item.totalAmount, { currency, decimals: 2 })}
                </p>
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{hiddenCount} more commitment{hiddenCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}