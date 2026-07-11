import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

export default function TripForm({ trip, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: trip?.name || '',
    target_date: trip?.target_date || '',
    notes: trip?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-xl p-4 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold font-heading">{trip ? 'Edit Trip' : 'New Trip'}</h4>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Trip Name</Label>
          <Input
            placeholder="e.g. Japan 2026"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label className="text-xs">Save By Date</Label>
          <Input
            type="date"
            value={form.target_date}
            onChange={e => setForm({ ...form, target_date: e.target.value })}
            className="mt-1"
            required
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">{trip ? 'Update Trip' : 'Add Trip'}</Button>
      </div>
    </form>
  );
}