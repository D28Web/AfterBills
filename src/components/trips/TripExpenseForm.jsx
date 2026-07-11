import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'food', label: 'Food & Drink' },
  { value: 'activities', label: 'Activities' },
  { value: 'transport', label: 'Transport' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
];

export default function TripExpenseForm({ tripName, expense, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    trip_name: tripName || expense?.trip_name || '',
    description: expense?.description || '',
    amount: expense?.amount ? String(expense.amount) : '',
    is_paid: expense?.is_paid || false,
    due_date: expense?.due_date || '',
    paid_date: expense?.paid_date || '',
    category: expense?.category || 'other',
    notes: expense?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount) || 0,
      paid_date: form.is_paid ? form.paid_date : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-border rounded-xl p-4 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Description</Label>
          <Input
            placeholder="e.g. Flights to Tokyo"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label className="text-xs">Amount</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className="mt-1"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Due Date</Label>
          <Input
            type="date"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_paid}
            onChange={e => setForm({ ...form, is_paid: e.target.checked })}
            className="rounded"
          />
          Already paid
        </label>
        {form.is_paid && (
          <Input
            type="date"
            value={form.paid_date}
            onChange={e => setForm({ ...form, paid_date: e.target.value })}
            className="h-8 text-xs flex-1"
          />
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">Save Expense</Button>
      </div>
    </form>
  );
}