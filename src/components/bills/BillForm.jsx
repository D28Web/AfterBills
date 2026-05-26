import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_LABELS } from '@/lib/forecast';
import { X } from 'lucide-react';

export default function BillForm({ bill, onSubmit, onCancel }) {
  const [form, setForm] = useState(bill || {
    name: '',
    amount: '',
    due_day: '',
    category: 'other',
    frequency: 'monthly',
    is_recurring: true,
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      due_day: parseInt(form.due_day),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-heading">{bill ? 'Edit Bill' : 'Add Bill'}</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Bill Name</Label>
          <Input
            placeholder="e.g. Netflix"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Due Day</Label>
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="1-31"
            value={form.due_day}
            onChange={e => setForm({ ...form, due_day: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        <div className="col-span-2 flex items-center gap-3">
          <Switch
            checked={form.is_recurring}
            onCheckedChange={v => setForm({ ...form, is_recurring: v })}
          />
          <Label>Recurring bill</Label>
        </div>

        <div className="col-span-2">
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Add any notes..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{bill ? 'Update' : 'Add Bill'}</Button>
      </div>
    </form>
  );
}