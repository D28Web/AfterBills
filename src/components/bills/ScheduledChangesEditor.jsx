import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export default function ScheduledChangesEditor({ changes = [], onChange }) {
  const update = (i, patch) => onChange(changes.map((c, j) => j === i ? { ...c, ...patch } : c));
  const add = () => onChange([...changes, { id: `ch-${Date.now()}`, label: '', amount: '', effective_date: '', end_date: '' }]);
  const remove = (i) => onChange(changes.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {changes.map((c, i) => (
        <div key={c.id || i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Input placeholder="Label (e.g. Rent increase)" value={c.label} onChange={e => update(i, { label: e.target.value })} className="h-8 text-xs flex-1" />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}><X className="w-3 h-3" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">New amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={c.amount} onChange={e => update(i, { amount: e.target.value === '' ? '' : parseFloat(e.target.value) })} className="h-8 text-xs" />
            </div>
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
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 text-xs gap-1 w-full">
        <Plus className="w-3 h-3" /> Add scheduled change
      </Button>
    </div>
  );
}