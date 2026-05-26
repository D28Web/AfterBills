import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const DEFAULT = { name: '', amount: '', frequency: 'monthly', start_date: '', notes: '' };

export default function IncomeStreamForm({ stream, onSubmit, onCancel }) {
  const [form, setForm] = useState(stream ? {
    ...stream,
    amount: stream.amount ?? '',
    start_date: stream.start_date || '',
  } : DEFAULT);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-muted/40 rounded-xl border border-border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Name</Label>
          <Input placeholder="e.g. Salary, Freelance" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Amount</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <Label>Frequency</Label>
          <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Start Date</Label>
          <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
        </div>
        <div className="col-span-2">
          <Label>Notes (optional)</Label>
          <Input placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1"><X className="w-3.5 h-3.5" />Cancel</Button>
        <Button type="submit" size="sm" className="gap-1"><Save className="w-3.5 h-3.5" />Save</Button>
      </div>
    </form>
  );
}