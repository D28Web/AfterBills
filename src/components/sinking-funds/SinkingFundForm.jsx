import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AttachmentsField from '@/components/common/AttachmentsField';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'four_weekly', label: 'Four-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const EMPTY = {
  name: '',
  target_amount: '',
  target_date: '',
  current_amount: '',
  linked_bill_id: 'none',
  contribution_frequency: 'monthly',
  priority: 'medium',
  notes: '',
  attachments: [],
  status: 'active',
};

export default function SinkingFundForm({ open, onOpenChange, onSubmit, fund = null, bills = [] }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      if (fund) {
        setForm({
          name: fund.name || '',
          target_amount: fund.target_amount != null ? String(fund.target_amount) : '',
          target_date: fund.target_date || '',
          current_amount: fund.current_amount != null ? String(fund.current_amount) : '',
          linked_bill_id: fund.linked_bill_id || 'none',
          contribution_frequency: fund.contribution_frequency || 'monthly',
          priority: fund.priority || 'medium',
          notes: fund.notes || '',
          attachments: fund.attachments || [],
          status: fund.status || 'active',
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, fund]);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target ? e.target.value : e }));
  const setSelect = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: form.name.trim(),
      target_amount: parseFloat(form.target_amount) || 0,
      target_date: form.target_date,
      current_amount: parseFloat(form.current_amount) || 0,
      linked_bill_id: form.linked_bill_id === 'none' ? null : form.linked_bill_id,
      contribution_frequency: form.contribution_frequency,
      priority: form.priority,
      notes: form.notes.trim() || null,
      attachments: form.attachments || [],
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold font-heading">
            {fund ? 'Edit Sinking Fund' : 'New Sinking Fund'}
          </h3>

          <div>
            <Label>Fund Name</Label>
            <Input placeholder="e.g. Car Insurance" value={form.name} onChange={set('name')} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.target_amount} onChange={set('target_amount')} required />
            </div>
            <div>
              <Label>Target Date</Label>
              <Input type="date" value={form.target_date} onChange={set('target_date')} required />
            </div>
          </div>

          <div>
            <Label>Already Set Aside (optional)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.current_amount} onChange={set('current_amount')} />
            <p className="text-xs text-muted-foreground mt-1">Planning data only — not linked to bank balances.</p>
          </div>

          <div>
            <Label>Linked Bill (optional)</Label>
            <Select value={form.linked_bill_id} onValueChange={setSelect('linked_bill_id')}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {bills.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contribution Frequency</Label>
              <Select value={form.contribution_frequency} onValueChange={setSelect('contribution_frequency')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={setSelect('priority')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {fund && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={setSelect('status')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Button type="submit">{fund ? 'Save Changes' : 'Create Fund'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}