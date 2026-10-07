import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { Wallet, ChevronRight, ChevronDown, Sparkles, AlertTriangle } from 'lucide-react';
import { getBillsInCycle } from '@/lib/payday';
import { CATEGORY_COLORS } from '@/lib/forecast';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export default function PayCycleRow({ cycle, index, cycleIncome, housingBills, bills, currency = '£', isOpen, onToggle }) {
  const cycleBills = getBillsInCycle(bills, cycle.start, cycle.end);
  const totalBills = cycleBills.reduce((s, b) => s + (b.monthAmount || b.amount), 0);
  const spare = cycleIncome - totalBills;
  const billPercent = cycleIncome > 0 ? Math.min(100, (totalBills / cycleIncome) * 100) : 0;
  const sparePercent = cycleIncome > 0 ? Math.max(0, Math.min(100, (spare / cycleIncome) * 100)) : 0;

  const isCurrent = index === 0;
  const isBillFree = cycleBills.length === 0;
  const cycleBillIds = new Set(cycleBills.map(b => b.id));
  const isMortgageFree = housingBills.length > 0 && !housingBills.some(b => cycleBillIds.has(b.id));
  const isHighSpare = isMortgageFree || (isBillFree && housingBills.length === 0);
  const cycleDays = differenceInDays(cycle.end, cycle.start) + 1;
  const spareClass = spare >= 0 ? 'text-primary' : 'text-destructive';

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isCurrent ? 'border-primary/40 bg-accent/20' : 'border-border bg-muted/20',
        (isBillFree || isHighSpare) && !isCurrent && 'border-green-200 bg-green-50/30 dark:border-green-900/40 dark:bg-green-900/10'
      )}
    >
      <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => onToggle(isOpen ? -1 : index)}>
        <div className="flex-shrink-0 w-16 text-center">
          <p className="text-xs font-bold text-foreground leading-tight">{format(cycle.start, 'd MMM')}</p>
          <p className="text-[10px] text-muted-foreground">{cycleDays}d</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-foreground">
              {isCurrent ? 'This cycle' : format(cycle.start, 'EEE d MMM')}
              {isBillFree && <span className="ml-1.5 text-green-600 dark:text-green-400">✓ bill-free</span>}
              {!isBillFree && isMortgageFree && <span className="ml-1.5 text-green-600 dark:text-green-400">💰 mortgage-free</span>}
            </span>
            <span className={cn('text-xs font-bold', spareClass)}>{formatSignedMoney(spare, { currency })} spare</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-destructive/70 rounded-l-full transition-all" style={{ width: `${billPercent}%` }} />
            <div className="h-full bg-primary/60 transition-all" style={{ width: `${sparePercent}%` }} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">{cycleBills.length} bill{cycleBills.length !== 1 ? 's' : ''} · {formatMoney(totalBills, { currency })}</span>
            <span className="text-[10px] text-muted-foreground">{formatMoney(cycleIncome, { currency })} income</span>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
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
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Pay received</span>
                </div>
                <span className="font-semibold text-primary">{formatSignedMoney(cycleIncome, { currency, decimals: 2 })}</span>
              </div>

              <Highlight show={isMortgageFree && !isBillFree} text="No mortgage this cycle — great month to save extra!" />
              {isBillFree ? (
                <Highlight show text="No bills this cycle — keep it all!" />
              ) : (
                cycleBills.map((bill, j) => (
                  <div key={j} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[bill.category] || '#888' }} />
                      <span className="text-foreground truncate">{bill.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{format(bill.dueDate, 'd MMM')}</span>
                    </div>
                    <span className="text-destructive/80 font-medium ml-2 flex-shrink-0">−{formatMoney(bill.monthAmount || bill.amount, { currency, decimals: 2 })}</span>
                  </div>
                ))
              )}

              <div className={cn('flex items-center justify-between text-sm font-semibold border-t border-border/50 pt-2', spareClass)}>
                {spare < 0 && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                <span>Remaining after bills</span>
                <span>{formatSignedMoney(spare, { currency, decimals: 2 })}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Highlight({ show, text }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 py-1 bg-green-50/50 dark:bg-green-900/20 rounded-lg px-2">
      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}