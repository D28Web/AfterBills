import { CATEGORY_COLORS, CATEGORY_LABELS, getBillDueDay } from '@/lib/forecast';
import { Pencil, Trash2, CalendarDays, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function BillCard({ bill, currency = '£', onEdit, onDelete }) {
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
            <p className="text-lg font-bold font-heading text-foreground whitespace-nowrap">
              {currency}{bill.amount.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {bill.start_date ? `From ${bill.start_date}` : `Day ${getBillDueDay(bill)}`}
            </span>
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {bill.frequency}
            </span>
          </div>
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