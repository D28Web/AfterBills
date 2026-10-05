import { CATEGORY_COLORS, CATEGORY_LABELS, getBillDueDay, getBillShare } from '@/lib/forecast';
import { Pencil, Trash2, CalendarDays, Repeat, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function BillCard({ bill, currency = '£', onEdit, onDelete }) {
  const hasPayoffTarget = !!bill.target_end_date && (bill.category === 'loans' || bill.category === 'credit_cards');
  const monthsLeft = hasPayoffTarget
    ? Math.max(0, (new Date(bill.target_end_date).getFullYear() * 12 + new Date(bill.target_end_date).getMonth()) - (new Date().getFullYear() * 12 + new Date().getMonth()))
    : 0;
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
            <div>
              <h4 className="text-sm font-semibold text-foreground truncate">{bill.name}</h4>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[bill.category]}</p>
            </div>
            <div className="text-right whitespace-nowrap">
              {bill.is_split && bill.split_between > 1 ? (
                <>
                  <p className="text-lg font-bold font-heading text-primary">{currency}{getBillShare(bill).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground line-through">{currency}{bill.amount.toFixed(2)} total</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                    <Users className="w-3 h-3" /> {bill.split_between} people
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold font-heading text-foreground">{currency}{bill.amount.toFixed(2)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {`Due ${getBillDueDay(bill)}${[,'st','nd','rd'][getBillDueDay(bill) % 10 > 3 || Math.floor(getBillDueDay(bill) % 100 / 10) === 1 ? 0 : getBillDueDay(bill) % 10] || 'th'}`}
            </span>
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {bill.frequency}
            </span>
          </div>
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