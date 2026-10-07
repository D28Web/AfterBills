import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AttachmentsField from '@/components/common/AttachmentsField';

export const SAVINGS_TYPES = [
  { value: 'general', label: 'General Savings' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'trip', label: 'Trip' },
  { value: 'car', label: 'Car' },
  { value: 'home', label: 'Home' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'annual_expense', label: 'Annual Expense' },
  { value: 'other', label: 'Other' },
];

// Reusable form for creating and editing savings goals.
// Supports the type system — when type is 'trip', destination and travel date
// fields are revealed. Editing updates the existing record (passed as `goal`).
export default function SavingsGoalForm({ goal, onSubmit, onCancel, currency = '£' }) {
  const [form, setForm] = useState(() => {
    if (goal) {
      return {
        ...goal,
        type: goal.type || (goal.is_emergency_fund ? 'emergency_fund' : 'general'),
        destination: goal.destination || '',
        travel_date: goal.travel_date || '',
        current_amount: goal.current_amount != null ? String(goal.current_amount) : '',
        target_amount: goal.target_amount != null ? String(goal.target_amount) : '',
        target_date: goal.target_date || '',
        notes: goal.notes || '',
        attachments: goal.attachments || [],
      };
    }
    return {
      name: '',
      type: 'general',
      target_amount: '',
      current_amount: '',
      target_date: '',
      destination: '',
      travel_date: '',
      notes: '',
      attachments: [],
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const isEmergency = form.type === 'emergency_fund';
    onSubmit({
      name: form.name,
      type: form.type,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      is_emergency_fund: isEmergency,
      destination: form.type === 'trip' ? (form.destination || null) : null,
      travel_date: form.type === 'trip' ? (form.travel_date || null) : null,
      target_date: form.target_date || null,
      notes: form.notes || null,
      attachments: form.attachments || [],
    });
  };

  const isTrip = form.type === 'trip';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold font-heading">{goal ? 'Edit Savings Goal' : 'New Savings Goal'}</h3>

      <div>
        <Label>Goal Name</Label>
        <Input placeholder="e.g. Holiday Fund" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </div>

      <div>
        <Label>Type</Label>
        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SAVINGS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isTrip && (
        <>
          <div>
            <Label>Destination</Label>
            <Input placeholder="e.g. Japan" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
          </div>
          <div>
            <Label>Travel Date</Label>
            <Input type="date" value={form.travel_date} onChange={e => setForm({ ...form, travel_date: e.target.value })} />
          </div>
        </>
      )}

      <div>
        <Label>Target Amount</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
      </div>

      <div>
        <Label>Already Saved (optional)</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
      </div>

      <div>
        <Label>Target Date (optional)</Label>
        <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
      </div>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea placeholder="Any extra details…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>

      <AttachmentsField attachments={form.attachments || []} onChange={atts => setForm({ ...form, attachments: atts })} />

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{goal ? 'Update Goal' : 'Create Goal'}</Button>
      </div>
    </form>
  );
}