import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CalendarDays, Repeat, CalendarClock } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { FREQUENCY_LABELS } from '@/lib/forecast';
import { INCOME_TYPE_LABELS } from '@/lib/income';
import { format, isAfter } from 'date-fns';

export default function IncomeStreamCard({ stream, currency, onEdit, onDelete }) {
  const isEnded = stream.end_date && isAfter(new Date(), new Date(stream.end_date));
  const isIrregular = stream.frequency === 'irregular';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{stream.name}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            {INCOME_TYPE_LABELS[stream.income_type] || 'Other'}
          </span>
          {stream.is_variable && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">Variable</span>
          )}
          {isEnded && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">Ended</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Repeat className="w-3 h-3" />{FREQUENCY_LABELS[stream.frequency]}</span>
          {stream.next_payment_date && (
            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />Next: {format(new Date(stream.next_payment_date), 'd MMM yyyy')}</span>
          )}
          {stream.start_date && !stream.next_payment_date && (
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />From {format(new Date(stream.start_date), 'd MMM yyyy')}</span>
          )}
          {stream.end_date && (
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Until {format(new Date(stream.end_date), 'd MMM yyyy')}</span>
          )}
        </div>
        {stream.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{stream.notes}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold font-heading text-foreground whitespace-nowrap">{formatMoney(stream.amount, { currency, decimals: 2 })}</p>
        <p className="text-[10px] text-muted-foreground">{isIrregular ? 'one-off' : 'per period'}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(stream)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(stream)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}