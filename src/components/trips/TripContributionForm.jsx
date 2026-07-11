import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function TripContributionForm({ tripName, onSubmit, onCancel, currency = '£' }) {
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, trip_name: tripName, amount: parseFloat(form.amount) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[90px]">
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
      <div className="flex-1 min-w-[120px]">
        <Label className="text-xs">Date</Label>
        <Input
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
          className="mt-1"
          required
        />
      </div>
      <Button type="submit" size="sm">Add</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </form>
  );
}