import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { Wallet, ChevronRight, ChevronDown, Sparkles, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { getPayCycles, getBillsInCycle, formatCycleLabel } from '@/lib/payday';
import { CATEGORY_COLORS } from '@/lib/forecast';
import { cn } from '@/lib/utils';

const FREQ_MULTIPLIER = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  four_weekly: 13 / 12,
  monthly: 1,
  annually: 1 / 12,
};

export default function PaydayCycles({ user, bills, currency = '£' }) {
  const [expanded, setExpanded] = useState(0);
  const monthlyIncome = user?.monthly_income || 0;
  const freq = user?.pay_frequency || 'monthly';
  const cycleIncome = monthlyIncome / (FREQ_MULTIPLIER[freq] || 1);

  // Show 6 cycles for a proper forecast
  const cycles = getPayCycles(user, 6);

  if (!monthlyIncome) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 text-center text-xs text-muted-foreground">
        Set your income in Settings to see pay cycle breakdowns.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground font-heading">Pay Cycle Forecast</h3>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {freq.replace('_', '-')} pay · {currency}{Math.round(cycleIncome)} per cycle
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{cycles.length} cycles ahead</span>
      </div>

      <div className="space-y-2">
        {cycles.map((cycle, i) => {
          const cycleBills = getBillsInCycle(bills, cycle.start, cycle.end);
          const totalBills = cycleBills.reduce((s, b) => s + (b.monthAmount || b.amount), 0);
          const spare = cycleIncome - totalBills;
          const sparePercent = cycleIncome > 0 ? Math.max(0, Math.min(100, (spare / cycleIncome) * 100)) : 0;
          const billPercent = cycleIncome > 0 ? Math.min(100, (totalBills / cycleIncome) * 100) : 0;
          const isOpen = expanded === i;
          const isCurrent = i === 0;
          const isBillFree = cycleBills.length === 0;
          const cycleDays = differenceInDays(cycle.end, cycle.start) + 1;

          return (
            <div
              key={i}
              className={cn(
                "rounded-xl border transition-all",
                isCurrent ? "border-primary/40 bg-accent/20" : "border-border bg-muted/20",
                isBillFree && !isCurrent && "border-green-200 bg-green-50/30 dark:border-green-900/40 dark:bg-green-900/10"
              )}
            >
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpanded(isOpen ? -1 : i)}
              >
                {/* Date label */}
                <div className="flex-shrink-0 w-16 text-center">
                  <p className="text-xs font-bold text-foreground leading-tight">{format(cycle.start, 'd MMM')}</p>
                  <p className="text-[10px] text-muted-foreground">{cycleDays}d</p>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-foreground">
                      {isCurrent ? 'This cycle' : format(cycle.start, 'EEE d MMM')}
                      {isBillFree && <span className="ml-1.5 text-green-600 dark:text-green-400">✓ bill-free</span>}
                    </span>
                    <span className={cn(
                      "text-xs font-bold",
                      spare >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {spare >= 0 ? '+' : '−'}{currency}{Math.abs(spare).toFixed(0)} spare
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-destructive/70 rounded-l-full transition-all"
                      style={{ width: `${billPercent}%` }}
                    />
                    <div
                      className="h-full bg-primary/60 transition-all"
                      style={{ width: `${sparePercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{cycleBills.length} bill{cycleBills.length !== 1 ? 's' : ''} · {currency}{totalBills.toFixed(0)}</span>
                    <span className="text-[10px] text-muted-foreground">{currency}{cycleIncome.toFixed(0)} income</span>
                  </div>
                </div>

                {/* Expand icon */}
                <div className="flex-shrink-0">
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  }
                </div>
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
                    <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
                      {/* Income row */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-3.5 h-3.5 text-primary" />
                          <span className="text-muted-foreground">Pay received</span>
                        </div>
                        <span className="font-semibold text-primary">+{currency}{cycleIncome.toFixed(2)}</span>
                      </div>

                      {/* Bills */}
                      {isBillFree ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 py-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>No bills this cycle — keep it all!</span>
                        </div>
                      ) : (
                        cycleBills.map((bill, j) => (
                          <div key={j} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[bill.category] || '#888' }}
                              />
                              <span className="text-foreground truncate">{bill.name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{format(bill.dueDate, 'd MMM')}</span>
                            </div>
                            <span className="text-destructive/80 font-medium ml-2 flex-shrink-0">
                              −{currency}{(bill.monthAmount || bill.amount).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}

                      {/* Total row */}
                      <div className={cn(
                        "flex items-center justify-between text-sm font-semibold border-t border-border/50 pt-2",
                        spare >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {spare < 0 && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                        <span>Remaining after bills</span>
                        <span>{spare >= 0 ? '+' : '−'}{currency}{Math.abs(spare).toFixed(2)}</span>
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