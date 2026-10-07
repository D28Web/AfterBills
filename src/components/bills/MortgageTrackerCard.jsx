import { Pencil, Trash2, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { formatMoney } from '@/lib/money';
import { getMortgageSummary, formatTerm } from '@/lib/mortgageCalculations';

/**
 * Mortgage tracker card — shown in the Bills page Mortgages section.
 * Consistent with the LoanPayoffCard pattern but with mortgage-specific metrics.
 * Clicking "View Details" opens the detailed mortgage breakdown dialog.
 */
export default function MortgageTrackerCard({ bill, currency = '£', onEdit, onDelete, onShowDetail }) {
  const s = getMortgageSummary(bill);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-3 h-12 rounded-full shrink-0 bg-primary" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-primary shrink-0" />
              {bill.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {s.interestTypeLabel || 'Mortgage'}{s.rate ? ` · ${s.rate}%` : ''}
            </p>
            {s.percentRepaid > 0 && (
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40">
                {s.balance <= 0 ? 'Paid off' : `${Math.round(s.percentRepaid)}% repaid`}
              </span>
            )}
          </div>
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

      {/* Progress bar */}
      {s.originalBalance > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{formatMoney(s.capitalRepaid, { currency, decimals: 0 })} repaid</span>
            <span className="font-medium text-foreground">{formatMoney(s.balance, { currency, decimals: 0 })} remaining</span>
          </div>
          <Progress value={Math.min(100, s.percentRepaid)} className="h-2" />
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <p className="text-xs text-muted-foreground">Outstanding balance</p>
          <p className="text-lg font-bold font-heading text-foreground">{formatMoney(s.balance, { currency, decimals: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Monthly payment</p>
          <p className="text-lg font-bold font-heading text-foreground">{formatMoney(s.payment, { currency, decimals: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Original borrowed</p>
          <p className="text-sm font-semibold text-foreground">{s.originalBalance > 0 ? formatMoney(s.originalBalance, { currency, decimals: 0 }) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Interest rate</p>
          <p className="text-sm font-semibold text-foreground">{s.rate ? `${s.rate}%` : '—'}</p>
        </div>
      </div>

      {/* Term vs Deal remaining */}
      <div className="mt-3 pt-3 border-t border-border space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Mortgage term remaining</span>
          <span className="font-semibold text-foreground">{s.remainingMonths != null ? formatTerm(s.remainingMonths) : '—'}</span>
        </div>
        {s.estimatedPayoffDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Est. mortgage-free date</span>
            <span className="font-medium text-foreground">{format(s.estimatedPayoffDate, 'MMM yyyy')}</span>
          </div>
        )}
        {s.deal && !s.deal.isExpired && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{s.interestTypeLabel || 'Deal'} remaining</span>
            <span className={`font-semibold ${s.deal.monthsRemaining <= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {formatTerm(s.deal.monthsRemaining)}
            </span>
          </div>
        )}
        {s.deal && !s.deal.isExpired && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Deal ends</span>
            <span className="font-medium text-foreground">{format(s.deal.dealEndDate, 'd MMM yyyy')}</span>
          </div>
        )}
      </div>

      {/* View details button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 gap-1"
        onClick={() => onShowDetail(bill)}
      >
        View Details & Projections <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}