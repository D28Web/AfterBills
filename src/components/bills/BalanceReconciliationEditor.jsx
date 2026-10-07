import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/money';
import { History, Plus, Trash2 } from 'lucide-react';

/**
 * Manual mortgage balance reconciliation editor.
 * Records confirmed balances from lender statements without overwriting
 * historic data. The most recent reconciliation becomes the current balance.
 */
export default function BalanceReconciliationEditor({ history = [], currency = '£', onChange }) {
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBalance, setNewBalance] = useState('');
  const [newNote, setNewNote] = useState('');

  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleAdd = () => {
    const balance = parseFloat(newBalance);
    if (!newDate || !Number.isFinite(balance)) return;
    onChange([...history, { date: newDate, balance, note: newNote || undefined }]);
    setNewDate(new Date().toISOString().slice(0, 10));
    setNewBalance('');
    setNewNote('');
    setAdding(false);
  };

  const handleDelete = (idx) => {
    onChange(history.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Balance Reconciliation History
        </p>
        {!adding && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3" /> Add Statement
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Statement Date</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Confirmed Balance</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={newBalance} onChange={e => setNewBalance(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea rows={2} placeholder="e.g. Annual statement from lender" value={newNote} onChange={e => setNewNote(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleAdd}>Save Reconciliation</Button>
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="space-y-1.5">
          {sorted.map((entry) => {
            const realIdx = history.indexOf(entry);
            return (
              <div key={`${entry.date}-${realIdx}`} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{format(new Date(entry.date), 'd MMM yyyy')}</p>
                  <p className="text-sm font-bold font-heading text-foreground">{formatMoney(entry.balance, { currency, decimals: 2 })}</p>
                  {entry.note && <p className="text-xs text-muted-foreground truncate">{entry.note}</p>}
                </div>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleDelete(realIdx)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : !adding ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No reconciliations yet. Add a balance from a lender statement to keep projections accurate.
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Reconciliations preserve historic balances. The most recent is used for future projections.
      </p>
    </div>
  );
}