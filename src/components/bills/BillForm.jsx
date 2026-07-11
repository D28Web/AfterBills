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
    start_date: new Date().toISOString().slice(0, 10),
    category: 'other',
    frequency: 'monthly',
    is_recurring: true,
    is_split: false,
    split_between: 2,
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
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
          <Label>Start Date</Label>
          <Input
            type="date"
            value={form.start_date || ''}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
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

        <div className="col-span-2 flex items-center gap-3">
          <Switch
            checked={form.is_split}
            onCheckedChange={v => setForm({ ...form, is_split: v })}
          />
          <Label>Split this bill</Label>
        </div>

        {form.is_split && (
          <div className="col-span-2">
            <Label>Split between (people)</Label>
            <Input
              type="number"
              min="2"
              max="20"
              value={form.split_between}
              onChange={e => setForm({ ...form, split_between: parseInt(e.target.value) || 2 })}
              required
            />
            {parseFloat(form.amount) > 0 && (
              <p className="text-xs text-primary mt-1">
                Your share: £{(parseFloat(form.amount) / (parseInt(form.split_between) || 1)).toFixed(2)} / {(parseInt(form.split_between) || 1)} people
              </p>
            )}
          </div>
        )}

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