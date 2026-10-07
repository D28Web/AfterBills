import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AttachmentsField from '@/components/common/AttachmentsField';
import { EXPENSE_CATEGORIES, PAYMENT_METHOD_LABELS } from '@/lib/expenses';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  name: '',
  amount: '',
  date: today(),
  category: 'other',
  payment_method: '',
  notes: '',
  attachments: [],
};

export default function ExpenseForm({ open, onOpenChange, onSubmit, expense = null }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      if (expense) {
        setForm({
          name: expense.name || '',
          amount: expense.amount != null ? String(expense.amount) : '',
          date: expense.date || today(),
          category: expense.category || 'other',
          payment_method: expense.payment_method || '',
          notes: expense.notes || '',
          attachments: expense.attachments || [],
        });
      } else {
        setForm({ ...EMPTY, date: today() });
      }
    }
  }, [open, expense]);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target ? e.target.value : e }));
  const setSelect = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: form.name.trim(),
      amount: parseFloat(form.amount) || 0,
      date: form.date,
      category: form.category,
      payment_method: form.payment_method || null,
      notes: form.notes.trim() || null,
      attachments: form.attachments || [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold font-heading">
            {expense ? 'Edit Expense' : 'Log Expense'}
          </h3>

          <div>
            <Label>What was it?</Label>
            <Input placeholder="e.g. Coffee, Parking, Groceries" value={form.name} onChange={set('name')} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={set('date')} required />
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={setSelect('category')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payment Method (optional)</Label>
            <Select value={form.payment_method || 'none'} onValueChange={setSelect('payment_method')}>
              <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any extra details…" value={form.notes} onChange={set('notes')} rows={2} />
          </div>

          <AttachmentsField
            attachments={form.attachments || []}
            onChange={atts => setForm(prev => ({ ...prev, attachments: atts }))}
          />

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{expense ? 'Save Changes' : 'Log Expense'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}