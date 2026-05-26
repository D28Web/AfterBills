import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CalendarDays, Repeat } from 'lucide-react';

const FREQ_LABEL = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };

export default function IncomeStreamCard({ stream, currency, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{stream.name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Repeat className="w-3 h-3" />{FREQ_LABEL[stream.frequency]}</span>
          {stream.start_date && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />From {stream.start_date}</span>}
        </div>
        {stream.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{stream.notes}</p>}
      </div>
      <p className="text-base font-bold font-heading text-foreground whitespace-nowrap">{currency}{stream.amount?.toFixed(2)}</p>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(stream)}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(stream)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}