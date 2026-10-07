import { motion } from 'framer-motion';
import { CATEGORY_COLORS, CATEGORY_LABELS, getUpcomingBills, getBillDueDay, getBillShare, ordinal } from '@/lib/forecast';
import { formatMoney } from '@/lib/money';
import { CalendarDays } from 'lucide-react';

export default function UpcomingBills({ bills, currency = '£' }) {
  const upcoming = getUpcomingBills(bills, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 font-heading">Upcoming Bills</h3>
      <div className="space-y-3">
        {upcoming.map((bill, i) => (
          <div key={bill.id || i} className="flex items-center gap-3">
            <div
              className="w-2 h-8 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[bill.category] }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[bill.category]}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{formatMoney(getBillShare(bill), { currency, decimals: 2 })}</p>
              {bill.is_split && bill.split_between > 1 && (
                <p className="text-xs text-muted-foreground line-through">{formatMoney(bill.amount, { currency, decimals: 2 })} total</p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <CalendarDays className="w-3 h-3" />
                {getBillDueDay(bill)}{ordinal(getBillDueDay(bill))}
              </p>
            </div>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No bills yet</p>
        )}
      </div>
    </motion.div>
  );
}