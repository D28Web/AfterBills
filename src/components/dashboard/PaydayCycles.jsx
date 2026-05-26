import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Wallet, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { getPayCycles, getBillsInCycle, formatCycleLabel } from '@/lib/payday';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/forecast';
import { cn } from '@/lib/utils';

export default function PaydayCycles({ user, bills, currency = '£' }) {
  const [expanded, setExpanded] = useState(0);
  const monthlyIncome = user?.monthly_income || 0;

  const cycles = getPayCycles(user, 3);

  // Compute per-cycle income fraction
  const freq = user?.pay_frequency || 'monthly';
  const freqMultiplier = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    four_weekly: 13 / 12,
    monthly: 1,
    annually: 1 / 12,
  }[freq] || 1;
  // Income per pay cycle
  const cycleIncome = monthlyIncome / freqMultiplier;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground font-heading">Pay Cycle Breakdown</h3>
        <span className="text-xs text-muted-foreground capitalize">{freq.replace('_', '-')} pay</span>
      </div>

      {cycles.map((cycle, i) => {
        const cycleBills = getBillsInCycle(bills, cycle.start, cycle.end);
        const totalBills = cycleBills.reduce((s, b) => s + (b.monthAmount || b.amount), 0);
        const spare = cycleIncome - totalBills;
        const isOpen = expanded === i;

        return (
          <div key={i} className={cn(
            "rounded-xl border transition-colors",
            i === 0 ? "border-primary/30 bg-accent/30" : "border-border bg-muted/30"
          )}>
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setExpanded(isOpen ? -1 : i)}
            >
              <div>
                <p className="text-xs font-semibold text-foreground">{formatCycleLabel(cycle, i)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(cycle.start, 'd MMM')} – {format(cycle.end, 'd MMM yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={cn("text-sm font-bold", spare >= 0 ? "text-primary" : "text-destructive")}>
                    {currency}{Math.abs(spare).toFixed(0)} {spare >= 0 ? 'spare' : 'short'}
                  </p>
                  <p className="text-xs text-muted-foreground">{cycleBills.length} bill{cycleBills.length !== 1 ? 's' : ''} · {currency}{totalBills.toFixed(0)}</p>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                {/* Income row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">Pay received</span>
                  </div>
                  <span className="font-semibold text-primary">+{currency}{cycleIncome.toFixed(2)}</span>
                </div>

                {cycleBills.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No bills in this cycle 🎉</p>
                )}

                {cycleBills.map((bill, j) => (
                  <div key={j} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[bill.category] }}
                      />
                      <span className="text-foreground truncate">{bill.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{format(bill.dueDate, 'd MMM')}</span>
                    </div>
                    <span className="text-destructive/80 font-medium ml-2">−{currency}{(bill.monthAmount || bill.amount).toFixed(2)}</span>
                  </div>
                ))}

                <div className={cn(
                  "flex items-center justify-between text-sm font-semibold border-t border-border/50 pt-2 mt-1",
                  spare >= 0 ? "text-primary" : "text-destructive"
                )}>
                  <span>Remaining</span>
                  <span>{spare >= 0 ? '' : '−'}{currency}{Math.abs(spare).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!user?.monthly_income && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Set your income in Settings to see pay cycle breakdowns.
        </p>
      )}
    </motion.div>
  );
}