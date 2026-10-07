import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export default function VariablePeriodsEditor({ periods = [], onChange }) {
  const update = (i, patch) => onChange(periods.map((p, j) => j === i ? { ...p, ...patch } : p));
  const add = () => onChange([...periods, { period_date: '', expected_amount: '', confirmed_amount: '', actual_amount: '' }]);
  const remove = (i) => onChange(periods.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {periods.map((p, i) => (
        <div key={i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Input type="date" value={p.period_date || ''} onChange={e => update(i, { period_date: e.target.value })} className="h-8 text-xs flex-1" />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}><X className="w-3 h-3" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Expected</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={p.expected_amount} onChange={e => update(i, { expected_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Confirmed</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={p.confirmed_amount} onChange={e => update(i, { confirmed_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Actual</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={p.actual_amount} onChange={e => update(i, { actual_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="h-8 text-xs" />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 text-xs gap-1 w-full">
        <Plus className="w-3 h-3" /> Add period override
      </Button>
    </div>
  );
}