import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ChevronRight, ChevronDown, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { getPayCycles, getBillsInCycle, getBillsNotInCycle } from '@/lib/payday';
import { CATEGORY_COLORS } from '@/lib/forecast';
import { formatMoney, formatSignedMoney, roundMoney } from '@/lib/money';
import { FREQ_TO_MONTHLY } from '@/lib/income';
import { cn } from '@/lib/utils';

export default function NoBillDuePeriods({ user, bills, currency = '£' }) {
  const [expanded, setExpanded] = useState(null);

  const monthlyIncome = user?.monthly_income || 0;
  const freq = user?.pay_frequency || 'monthly';
  const cycleIncome = monthlyIncome / (FREQ_TO_MONTHLY[freq] || 1);

  const cycles = getPayCycles(user, 13);

  // Find cycles where at least one recurring bill is NOT due
  const cycleData = cycles.map((cycle, i) => {
    const due = getBillsInCycle(bills, cycle.start, cycle.end);
    const notDue = getBillsNotInCycle(bills, due, cycle.start, cycle.end);
    const totalBills = roundMoney(due.reduce((s, b) => s + b.amount, 0));
    const spare = roundMoney(cycleIncome - totalBills);
    return { cycle, i, due, notDue, totalBills, spare };
  });

  // Only show cycles that have bills NOT due (the interesting ones)
  const highlightedCycles = cycleData.filter(d => d.notDue.length > 0);

  if (!monthlyIncome || highlightedCycles.length === 0) {
    return null;
  }

  // For context: what's the "typical" cycle spend (when all bills are due)
  const maxBillsCycle = cycleData.reduce((max, d) => d.totalBills > max ? d.totalBills : max, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground font-heading">Higher Disposable Income Periods</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pay cycles where a recurring bill falls outside this pay period — giving you more available cash.
          </p>
        </div>
        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap ml-3">
          {highlightedCycles.length} cycle{highlightedCycles.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {highlightedCycles.map(({ cycle, i, due, notDue, totalBills, spare }) => {
          const isOpen = expanded === i;
          const cycleDays = differenceInDays(cycle.end, cycle.start) + 1;
          const extraVsTypical = maxBillsCycle - totalBills;

          // Generate a smart label for what's not due
          const notDueNames = notDue.map(b => b.name);
          const notDueLabel = notDueNames.length === 1
            ? `No ${notDueNames[0]} due this pay cycle`
            : `${notDueNames.length} bills not due this pay cycle`;

          return (
            <div
              key={i}
              className="rounded-xl border border-green-200 bg-green-50/40 dark:border-green-900/40 dark:bg-green-900/10 overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                {/* Sparkle + date */}
                <div className="flex-shrink-0 flex flex-col items-center w-16 text-center">
                  <Sparkles className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mb-0.5" />
                  <p className="text-[11px] font-bold text-foreground leading-tight">{format(cycle.start, 'd MMM')}</p>
                  <p className="text-[10px] text-muted-foreground">{cycleDays}d</p>
                </div>

                {/* Summary */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 truncate">{notDueLabel}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(cycle.start, 'd MMM')} – {format(cycle.end, 'd MMM')}
                    {extraVsTypical > 0 && (
                      <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                        {formatSignedMoney(extraVsTypical, { currency })} extra available
                      </span>
                    )}
                  </p>
                </div>

                {/* Spare */}
                <div className="flex-shrink-0 text-right mr-1">
                  <p className="text-sm font-bold text-primary">{formatMoney(spare, { currency })}</p>
                  <p className="text-[10px] text-muted-foreground">spare</p>
                </div>

                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-green-200/60 dark:border-green-900/30 space-y-3">

                      {/* Income */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Income this cycle</span>
                        <span className="font-semibold text-primary">{formatSignedMoney(cycleIncome, { currency, decimals: 2 })}</span>
                      </div>

                      {/* Bills due */}
                      {due.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground uppercase tracking-wide">Bills due this cycle</p>
                          {due.map((bill, j) => (
                            <div key={j} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[bill.category] || '#888' }} />
                                <span className="truncate text-foreground">{bill.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{format(bill.dueDate, 'd MMM')}</span>
                              </div>
                              <span className="text-destructive/80 font-medium ml-2 flex-shrink-0">−{formatMoney(bill.amount, { currency, decimals: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {due.length === 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400">No bills due at all this cycle!</p>
                      )}

                      {/* Bills NOT due */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                          Bills not due this pay cycle
                        </p>
                        {notDue.map((bill, j) => (
                          <div key={j} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full flex-shrink-0 opacity-40" style={{ backgroundColor: CATEGORY_COLORS[bill.category] || '#888' }} />
                              <span className="truncate text-muted-foreground">{bill.name}</span>
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                                falls outside this pay period
                              </span>
                            </div>
                            <span className="text-muted-foreground/60 font-medium ml-2 flex-shrink-0 line-through text-xs">{formatMoney(bill.amount, { currency, decimals: 2 })}</span>
                          </div>
                        ))}
                      </div>

                      {/* Highlight message */}
                      <div className="bg-green-100/60 dark:bg-green-900/20 rounded-xl p-3 space-y-1">
                        {notDue.map((bill, j) => (
                          <p key={j} className="text-xs text-green-700 dark:text-green-400 font-medium">
                            Your {bill.name.toLowerCase()} is not due in this pay cycle. This gives you{' '}
                            <span className="font-bold">{formatMoney(bill.amount, { currency, decimals: 2 })}</span> more available than a normal cycle.
                          </p>
                        ))}
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Great opportunity to save or pay ahead.
                        </p>
                      </div>

                      {/* Total remaining */}
                      <div className="flex justify-between text-sm font-semibold border-t border-green-200/60 dark:border-green-900/30 pt-2 text-primary">
                        <span>Money left after bills</span>
                        <span>{formatSignedMoney(spare, { currency, decimals: 2 })}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}