import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

export default function BillSubcategoryForm({ subcategory, currency = '£', onSubmit, onCancel }) {
  const [form, setForm] = useState(subcategory
    ? { name: subcategory.name, budget_amount: subcategory.budget_amount }
    : { name: '', budget_amount: '' });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ name: form.name, budget_amount: parseFloat(form.budget_amount) });
  };

  return (
    <form onSubmit={submit} className="flex gap-2 items-end bg-muted/50 rounded-lg p-2">
      <div className="flex-1">
        <Label className="text-xs">Name</Label>
        <Input
          placeholder="e.g. Snacks"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="w-28">
        <Label className="text-xs">Budget ({currency})</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={form.budget_amount}
          onChange={e => setForm({ ...form, budget_amount: e.target.value })}
          required
        />
      </div>
      <Button type="submit" size="sm">{subcategory ? 'Save' : 'Add'}</Button>
      {onCancel && (
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </form>
  );
}