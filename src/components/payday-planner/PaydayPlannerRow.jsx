import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInCalendarDays } from 'date-fns';
import {
  Wallet, Receipt, CreditCard, PiggyBank, Target,
  ChevronRight, ChevronDown, TrendingDown, CalendarClock,
} from 'lucide-react';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export default function PaydayPlannerRow({ data, currency = '£', isOpen, onToggle }) {
  const { cycle, index } = data;
  const isCurrent = index === 0;
  const daysAway = differenceInCalendarDays(cycle.start, new Date());
  const leftClass = data.amountLeft >= 0 ? 'text-primary' : 'text-destructive';

  const committedPct = data.income.total > 0
    ? Math.min(100, (data.totalCommitted / data.income.total) * 100)
    : 0;

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isCurrent ? 'border-primary/40 bg-accent/20' : 'border-border bg-muted/20'
      )}
    >
      <button className="w-full flex items-center gap-3 p-3 text-left" onClick={() => onToggle(isOpen ? -1 : index)}>
        <div className="flex-shrink-0 w-16 text-center">
          <p className="text-xs font-bold text-foreground leading-tight">{format(cycle.start, 'd MMM')}</p>
          <p className="text-[10px] text-muted-foreground">{data.cycleDays}d</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-foreground">
              {isCurrent ? 'This payday' : format(cycle.start, 'EEE d MMM')}
              {daysAway >= 0 && !isCurrent && daysAway <= 7 && (
                <span className="ml-1.5 text-primary">· in {daysAway}d</span>
              )}
            </span>
            <span className={cn('text-xs font-bold', leftClass)}>
              {formatSignedMoney(data.amountLeft, { currency, decimals: 2 })} left
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive/70 rounded-full transition-all"
              style={{ width: `${committedPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {formatMoney(data.totalCommitted, { currency, decimals: 2 })} committed
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatMoney(data.income.total, { currency, decimals: 2 })} income
            </span>
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
            <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
              {/* Income */}
              <Section icon={Wallet} iconClass="text-primary" label="Expected income" amount={data.income.total} currency={currency} />
              <div className="pl-6 space-y-1">
                <Line label="Primary pay" amount={data.income.primary} currency={currency} positive />
                {data.income.additional.map((a, i) => (
                  <Line key={i} label={`${a.name} (${format(a.date, 'd MMM')})`} amount={a.amount} currency={currency} positive />
                ))}
              </div>

              {/* Bills */}
              <Section
                icon={Receipt}
                iconClass="text-blue-600 dark:text-blue-400"
                label="Bills due before next payday"
                amount={data.regularBillsTotal}
                currency={currency}
                count={data.regularBills.length}
              />
              <div className="pl-6 space-y-1">
                {data.regularBills.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No bills due this cycle</p>
                ) : (
                  data.regularBills.map((b, i) => (
                    <Line key={i} label={`${b.name} (${format(b.dueDate, 'd MMM')})`} amount={b.amount} currency={currency} />
                  ))
                )}
              </div>

              {/* Debt repayments */}
              <Section
                icon={CreditCard}
                iconClass="text-red-600 dark:text-red-400"
                label="Debt repayments"
                amount={data.debtTotal}
                currency={currency}
                count={data.debtRepayments.length}
              />
              <div className="pl-6 space-y-1">
                {data.debtRepayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No debt payments this cycle</p>
                ) : (
                  data.debtRepayments.map((b, i) => (
                    <Line key={i} label={`${b.name} (${format(b.dueDate, 'd MMM')})`} amount={b.amount} currency={currency} />
                  ))
                )}
              </div>

              {/* Sinking fund contributions */}
              <Section
                icon={PiggyBank}
                iconClass="text-emerald-600 dark:text-emerald-400"
                label="Sinking fund contributions"
                amount={data.sinkingFundTotal}
                currency={currency}
                count={data.sinkingFundItems.length}
              />
              <div className="pl-6 space-y-1">
                {data.sinkingFundItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No sinking fund contributions</p>
                ) : (
                  data.sinkingFundItems.map((f, i) => (
                    <Line key={i} label={f.name} amount={f.amount} currency={currency} />
                  ))
                )}
              </div>

              {/* Planned savings */}
              <Section
                icon={Target}
                iconClass="text-purple-600 dark:text-purple-400"
                label="Planned savings (suggested)"
                amount={data.plannedSavings}
                currency={currency}
              />

              {/* Totals */}
              <div className="border-t border-border/50 pt-2 space-y-1">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-muted-foreground">Total committed</span>
                  <span className="text-foreground">{formatMoney(data.totalCommitted, { currency, decimals: 2 })}</span>
                </div>
                <div className={cn('flex items-center justify-between text-sm font-bold', leftClass)}>
                  {data.amountLeft < 0 && <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                  <span>Amount left</span>
                  <span>{formatSignedMoney(data.amountLeft, { currency, decimals: 2 })}</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  <span className="font-medium">{formatMoney(data.perWeekAvailable, { currency, decimals: 2 })}</span>
                  {' '}/ week available until next payday
                  {data.weeksInCycle > 0 && (
                    <span className="text-muted-foreground"> · {Math.ceil(data.weeksInCycle)} weeks</span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ icon: Icon, iconClass, label, amount, currency, count }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Icon className={cn('w-3.5 h-3.5', iconClass)} />
        <span className="text-muted-foreground">{label}</span>
        {count != null && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      <span className="font-medium text-foreground">{formatMoney(amount, { currency, decimals: 2 })}</span>
    </div>
  );
}

function Line({ label, amount, currency, positive }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={cn('flex-shrink-0 ml-2', positive ? 'text-primary' : 'text-destructive/80')}>
        {positive ? '+' : '−'}{formatMoney(amount, { currency, decimals: 2 })}
      </span>
    </div>
  );
}