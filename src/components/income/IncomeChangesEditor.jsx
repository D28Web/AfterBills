import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

const CHANGE_TYPES = [
  { value: 'amount', label: 'Amount change (rise/reduction)' },
  { value: 'one_off', label: 'One-off payment (bonus)' },
  { value: 'addition', label: 'Temporary addition (overtime)' },
];

export default function IncomeChangesEditor({ changes = [], onChange, incomeMode = 'net' }) {
  const update = (i, patch) => onChange(changes.map((c, j) => j === i ? { ...c, ...patch } : c));
  const add = () => onChange([...changes, { id: `ic-${Date.now()}`, label: '', change_type: 'amount', amount: '', gross_annual: '', effective_date: '', end_date: '' }]);
  const remove = (i) => onChange(changes.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {changes.map((c, i) => {
        const isSalaryAmount = incomeMode === 'salary' && c.change_type === 'amount';
        return (
          <div key={c.id || i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Select value={c.change_type} onValueChange={v => update(i, { change_type: v })}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}><X className="w-3 h-3" /></Button>
            </div>
            <Input placeholder="Label (e.g. Pay rise, Christmas bonus)" value={c.label} onChange={e => update(i, { label: e.target.value })} className="h-8 text-xs" />
            <div className="grid grid-cols-3 gap-2">
              {isSalaryAmount ? (
                <div>
                  <Label className="text-[10px]">New gross annual</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={c.gross_annual} onChange={e => update(i, { gross_annual: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="h-8 text-xs" />
                </div>
              ) : (
                <div>
                  <Label className="text-[10px]">{c.change_type === 'one_off' ? 'Payment' : 'Amount'}</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={c.amount} onChange={e => update(i, { amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="h-8 text-xs" />
                </div>
              )}
              <div>
                <Label className="text-[10px]">Effective from</Label>
                <Input type="date" value={c.effective_date || ''} onChange={e => update(i, { effective_date: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">End (optional)</Label>
                <Input type="date" value={c.end_date || ''} onChange={e => update(i, { end_date: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 text-xs gap-1 w-full">
        <Plus className="w-3 h-3" /> Add scheduled change
      </Button>
    </div>
  );
}