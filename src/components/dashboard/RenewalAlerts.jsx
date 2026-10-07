import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, RefreshCw, TrendingUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import { getUpcomingRenewals, getIntroPriceExpiries } from '@/lib/contracts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function RenewalAlerts({ bills, currency = '£' }) {
  const queryClient = useQueryClient();
  const renewals = getUpcomingRenewals(bills, 60);
  const introExpiries = getIntroPriceExpiries(bills, 30);

  const applyPrice = useMutation({
    mutationFn: ({ id, oldAmount, newPrice, existingHistory }) => {
      const pctChange = oldAmount > 0 ? Math.round(((newPrice - oldAmount) / oldAmount) * 10000) / 100 : 0;
      const historyEntry = {
        previous_amount: oldAmount,
        new_amount: newPrice,
        effective_date: new Date().toISOString().slice(0, 10),
        percentage_change: pctChange,
      };
      return base44.entities.Bill.update(id, {
        amount: newPrice,
        intro_price_end_date: null,
        expected_new_price: null,
        amount_history: [...(existingHistory || []), historyEntry],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });

  if (renewals.length === 0 && introExpiries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold font-heading">Renewals & Contract Alerts</h3>
      </div>

      {renewals.length > 0 && (
        <div className="space-y-2">
          {renewals.map(({ bill, renewalDate, daysUntil, noticeDaysLeft }) => (
            <div key={bill.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-800/30">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {format(renewalDate, 'd MMM yyyy')}
                  </span>
                  <span>·</span>
                  <span className={daysUntil <= 14 ? 'text-amber-700 dark:text-amber-400 font-medium' : ''}>
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                  </span>
                  {noticeDaysLeft !== null && (
                    <>
                      <span>·</span>
                      <span className={noticeDaysLeft <= 0 ? 'text-destructive font-medium' : 'text-amber-700 dark:text-amber-400'}>
                        {noticeDaysLeft <= 0 ? 'Notice period passed' : `Notice by ${noticeDaysLeft}d`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Link to="/bills" className="shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {introExpiries.length > 0 && (
        <div className="space-y-2">
          {introExpiries.map(({ bill, expiryDate, daysUntil }) => (
            <div key={bill.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-200/50 dark:bg-orange-900/10 dark:border-orange-800/30">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {daysUntil < 0 ? 'Intro price expired' : daysUntil === 0 ? 'Intro ends today' : `Intro ends in ${daysUntil}d`}
                  </span>
                  <span>·</span>
                  <span>Now: {formatMoney(bill.amount, { currency, decimals: 2 })}</span>
                  {bill.expected_new_price != null && (
                    <>
                      <span>→</span>
                      <span className="font-medium text-foreground">{formatMoney(bill.expected_new_price, { currency, decimals: 2 })}</span>
                    </>
                  )}
                </div>
              </div>
              {bill.expected_new_price != null && (
                <Button
                  size="sm"
                  className="h-7 text-xs shrink-0 gap-1"
                  disabled={applyPrice.isPending}
                  onClick={() => applyPrice.mutate({ id: bill.id, oldAmount: bill.amount, newPrice: bill.expected_new_price, existingHistory: bill.amount_history })}
                >
                  <Check className="w-3 h-3" /> Apply
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}