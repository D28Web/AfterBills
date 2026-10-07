import { useState } from 'react';
import { CATEGORY_COLORS, CATEGORY_LABELS, FREQUENCY_LABELS, getBillShare, formatDueDay } from '@/lib/forecast';
import { formatMoney } from '@/lib/money';
import { isEssentialBill } from '@/lib/essential';
import { Pencil, Trash2, CalendarDays, Repeat, Users, Target, ChevronDown, RefreshCw, TrendingUp, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import BillSubcategoryList from '@/components/bills/BillSubcategoryList';
import FinanceTrackingCard from '@/components/bills/FinanceTrackingCard';
import AnnualPaymentComparison from '@/components/bills/AnnualPaymentComparison';
import AnnualFundProgress from '@/components/bills/AnnualFundProgress';
import { isFinanceBill, FINANCE_TYPE_LABELS } from '@/lib/financeTracking';
import { isEligibleForAnnualComparison } from '@/lib/annualPayment';

export default function BillCard({ bill, currency = '£', onEdit, onDelete, goals = [], onCreateFund, onAddContribution }) {
  const hasPayoffTarget = !!bill.target_end_date && (bill.category === 'loans' || bill.category === 'credit_cards');
  const monthsLeft = hasPayoffTarget
    ? Math.max(0, (new Date(bill.target_end_date).getFullYear() * 12 + new Date(bill.target_end_date).getMonth()) - (new Date().getFullYear() * 12 + new Date().getMonth()))
    : 0;
  const [expanded, setExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-3 h-full min-h-[3rem] rounded-full shrink-0"
          style={{ backgroundColor: CATEGORY_COLORS[bill.category] }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{bill.name}</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[bill.category]}</p>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  isEssentialBill(bill)
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isEssentialBill(bill) ? 'Essential' : 'Non-essential'}
                </span>
                {bill.is_salary_sacrifice && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
                    Salary Sacrifice
                  </span>
                )}
                {isFinanceBill(bill) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                    {FINANCE_TYPE_LABELS[bill.finance_type] || 'Finance'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right whitespace-nowrap">
              {bill.is_split && bill.split_between > 1 ? (
                <>
                  <p className="text-lg font-bold font-heading text-primary">{formatMoney(getBillShare(bill), { currency, decimals: 2 })}</p>
                  <p className="text-xs text-muted-foreground line-through">{formatMoney(bill.amount, { currency, decimals: 2 })} total</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                    <Users className="w-3 h-3" /> {bill.split_between} people
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold font-heading text-foreground">{formatMoney(bill.amount, { currency, decimals: 2 })}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDueDay(bill)}
            </span>
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {FREQUENCY_LABELS[bill.frequency] || bill.frequency}
            </span>
            {bill.end_date && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <CalendarClock className="w-3 h-3" /> Until {format(new Date(bill.end_date), 'd MMM yyyy')}
              </span>
            )}
            {bill.scheduled_changes?.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                <TrendingUp className="w-3 h-3" /> {bill.scheduled_changes.length} scheduled change{bill.scheduled_changes.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {(bill.renewal_date || bill.intro_price_end_date) && (
            <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
              {bill.renewal_date && (() => {
                const daysLeft = differenceInCalendarDays(new Date(bill.renewal_date), new Date());
                const isUrgent = daysLeft >= 0 && daysLeft <= 30;
                return (
                  <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded", isUrgent ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" : "bg-muted text-muted-foreground")}>
                    <RefreshCw className="w-3 h-3" />
                    Renews {format(new Date(bill.renewal_date), 'd MMM yyyy')}
                    {isUrgent && daysLeft <= 7 && <span className="font-medium">· {daysLeft === 0 ? 'today' : `${daysLeft}d`}</span>}
                  </span>
                );
              })()}
              {bill.intro_price_end_date && (() => {
                const daysLeft = differenceInCalendarDays(new Date(bill.intro_price_end_date), new Date());
                const isUrgent = daysLeft <= 30;
                return (
                  <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded", isUrgent ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" : "bg-muted text-muted-foreground")}>
                    <TrendingUp className="w-3 h-3" />
                    {daysLeft < 0 ? 'Intro expired' : `Intro ends ${format(new Date(bill.intro_price_end_date), 'd MMM')}`}
                  </span>
                );
              })()}
            </div>
          )}
          {hasPayoffTarget && (
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <Target className="w-3 h-3" />
              <span>Pay off by {format(new Date(bill.target_end_date), 'd MMM yyyy')}</span>
              <span className="text-muted-foreground">
                {monthsLeft > 0 ? `(${monthsLeft} mo left)` : '(past due)'}
              </span>
            </div>
          )}
          {bill.notes && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{bill.notes}</p>
          )}
          {isFinanceBill(bill) && <FinanceTrackingCard bill={bill} currency={currency} />}
          {isEligibleForAnnualComparison(bill) && (
            <AnnualPaymentComparison
              bill={bill}
              currency={currency}
              onCreateFund={() => onCreateFund?.(bill)}
              onGoToFund={() => {}}
            />
          )}
          {bill.annual_fund_goal_id && (() => {
            const goal = goals.find(g => g.id === bill.annual_fund_goal_id);
            if (!goal) return null;
            return (
              <AnnualFundProgress
                bill={bill}
                goal={goal}
                currency={currency}
                onAddContribution={onAddContribution}
              />
            );
          })()}
          <button type="button" onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            Subcategories
          </button>
          {expanded && <BillSubcategoryList bill={bill} currency={currency} />}
          {bill.amount_history?.length > 0 && (
            <>
              <button type="button" onClick={() => setHistoryExpanded(e => !e)} className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                <ChevronDown className={`w-3 h-3 transition-transform ${historyExpanded ? 'rotate-180' : ''}`} />
                Price History ({bill.amount_history.length})
              </button>
              {historyExpanded && (
                <div className="mt-2 space-y-1.5">
                  {bill.amount_history.slice().reverse().map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">{format(new Date(entry.effective_date), 'd MMM yyyy')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through">{formatMoney(entry.previous_amount, { currency, decimals: 2 })}</span>
                        <span>→</span>
                        <span className="font-medium text-foreground">{formatMoney(entry.new_amount, { currency, decimals: 2 })}</span>
                        <span className={entry.percentage_change >= 0 ? 'text-destructive' : 'text-primary'}>
                          {entry.percentage_change >= 0 ? '+' : ''}{entry.percentage_change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(bill)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(bill)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}