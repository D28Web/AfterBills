import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatMoney, roundMoney } from '@/lib/money';
import { format } from 'date-fns';

// Editor for bill price history entries. Allows deleting individual entries
// that were entered incorrectly. When an entry is deleted, the chain is
// repaired: the subsequent entry's previous_amount is updated to the deleted
// entry's previous_amount, and its percentage_change is recalculated.
export default function AmountHistoryEditor({ history = [], currency = '£', onChange }) {
  const [confirmIndex, setConfirmIndex] = useState(null);

  const handleDelete = (index) => {
    const newHistory = [...history];
    const deleted = newHistory[index];
    newHistory.splice(index, 1);
    // Repair the chain: if there's a subsequent entry, update its previous_amount
    if (index < newHistory.length && deleted) {
      newHistory[index] = {
        ...newHistory[index],
        previous_amount: deleted.previous_amount,
      };
      if (newHistory[index].previous_amount > 0) {
        newHistory[index].percentage_change = roundMoney(
          ((newHistory[index].new_amount - newHistory[index].previous_amount) / newHistory[index].previous_amount) * 100
        );
      }
    }
    onChange(newHistory);
    setConfirmIndex(null);
  };

  if (history.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Price History</p>
      <p className="text-xs text-muted-foreground">Delete an entry if it was recorded incorrectly. Subsequent entries are adjusted automatically.</p>
      {history.map((entry, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{formatMoney(entry.previous_amount, { currency, decimals: 2 })}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium text-foreground">{formatMoney(entry.new_amount, { currency, decimals: 2 })}</span>
            <span className="text-muted-foreground">({entry.percentage_change >= 0 ? '+' : ''}{entry.percentage_change}%)</span>
            <span className="text-muted-foreground ml-1">{format(new Date(entry.effective_date), 'd MMM yyyy')}</span>
          </div>
          <button type="button" onClick={() => setConfirmIndex(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <Dialog open={confirmIndex !== null} onOpenChange={v => !v && setConfirmIndex(null)}>
        <DialogContent className="max-w-xs">
          <p className="text-sm text-center py-4">Delete this price history entry? This cannot be undone.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setConfirmIndex(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDelete(confirmIndex)}>Delete Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}