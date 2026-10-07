import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { availableReminderTypes } from '@/lib/reminders';
import { CATEGORY_LABELS } from '@/lib/forecast';
import { motion } from 'framer-motion';

const ITEM_TYPES = [
  { value: 'bill', label: 'Bill' },
  { value: 'savings_goal', label: 'Savings Goal' },
  { value: 'sinking_fund', label: 'Sinking Fund' },
];

const REMINDER_TYPE_LABELS = {
  bill_due: 'Bill due date',
  renewal: 'Renewal date',
  debt_repayment: 'Debt repayment',
  savings_deadline: 'Savings deadline',
  sinking_fund_target: 'Sinking fund target date',
};

function ReminderForm({ bills, goals, sinkingFunds, onSubmit, onCancel, editing }) {
  const [itemType, setItemType] = useState(editing?.item_type || 'bill');
  const [itemId, setItemId] = useState(editing?.item_id || '');
  const [reminderType, setReminderType] = useState(editing?.reminder_type || 'bill_due');
  const [advanceDays, setAdvanceDays] = useState(String(editing?.advance_days ?? 7));
  const [targetDate, setTargetDate] = useState(editing?.target_date || '');

  const itemOptions = itemType === 'bill'
    ? bills.map(b => ({ value: b.id, label: `${b.name} (${CATEGORY_LABELS[b.category] || b.category})`, item: b }))
    : itemType === 'savings_goal'
      ? goals.map(g => ({ value: g.id, label: g.name, item: g }))
      : sinkingFunds.map(f => ({ value: f.id, label: f.name, item: f }));

  const selectedItem = itemOptions.find(o => o.value === itemId)?.item || null;
  const typeOptions = availableReminderTypes(itemType, selectedItem);
  const needsTargetDate = reminderType === 'savings_deadline';

  const canSubmit = itemId && reminderType && (!needsTargetDate || targetDate);

  const handleSubmit = () => {
    const label = itemOptions.find(o => o.value === itemId)?.label || '';
    onSubmit({
      item_type: itemType,
      item_id: itemId,
      item_name: label.split(' (')[0],
      reminder_type: reminderType,
      advance_days: parseInt(advanceDays) || 7,
      enabled: true,
      target_date: needsTargetDate ? targetDate : null,
    });
  };

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Item type</Label>
          <Select value={itemType} onValueChange={v => { setItemType(v); setItemId(''); setReminderType('bill_due'); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Item</Label>
          <Select value={itemId} onValueChange={v => { setItemId(v); setReminderType('bill_due'); }}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {itemOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Reminder type</Label>
          <Select value={reminderType} onValueChange={setReminderType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Remind me (days in advance)</Label>
          <Input type="number" min="0" max="90" value={advanceDays} onChange={e => setAdvanceDays(e.target.value)} />
        </div>
      </div>

      {needsTargetDate && (
        <div>
          <Label>Deadline date</Label>
          <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>{editing ? 'Update' : 'Add'} reminder</Button>
      </div>
    </div>
  );
}

function ReminderRow({ reminder, onEdit, onDelete, onToggle }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <div className="p-2 rounded-lg bg-primary/10">
        <Bell className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{reminder.item_name}</p>
        <p className="text-xs text-muted-foreground">
          {REMINDER_TYPE_LABELS[reminder.reminder_type] || reminder.reminder_type}
          {' · '}{reminder.advance_days}d in advance
          {reminder.target_date && ` · ${format(new Date(reminder.target_date), 'd MMM yyyy')}`}
        </p>
      </div>
      <Switch checked={reminder.enabled} onCheckedChange={() => onToggle(reminder)} />
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(reminder)}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(reminder)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function Reminders() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.UserReminder.list(),
  });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.SavingsGoal.list() });
  const { data: sinkingFunds = [] } = useQuery({ queryKey: ['sinking-funds'], queryFn: () => base44.entities.SinkingFund.list() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reminders'] });

  const create = useMutation({
    mutationFn: (data) => base44.entities.UserReminder.create(data),
    onSuccess: () => { invalidate(); setShowForm(false); toast.success('Reminder added'); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserReminder.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); setShowForm(false); toast.success('Reminder updated'); },
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.UserReminder.delete(id),
    onSuccess: () => { invalidate(); toast.success('Reminder deleted'); },
  });
  const toggle = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.UserReminder.update(id, { enabled }),
    onSuccess: () => invalidate(),
  });

  const handleSubmit = (data) => {
    if (editing) update.mutate({ id: editing.id, data });
    else create.mutate(data);
  };

  return (
    <PageContainer maxWidth="form" className="space-y-6">
      <PageHeader
        title="Reminders"
        subtitle="Optional heads-up for the dates that matter to you"
        actions={
          !showForm && !editing && (
            <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          )
        }
      />

      {(showForm || editing) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ReminderForm
            bills={bills}
            goals={goals}
            sinkingFunds={sinkingFunds}
            editing={editing}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </motion.div>
      )}

      <div className="space-y-2">
        {reminders.length === 0 && !showForm && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No reminders yet. Add one to get a heads-up before a bill, renewal, or deadline.
          </div>
        )}
        {reminders.map(r => (
          <ReminderRow
            key={r.id}
            reminder={r}
            onEdit={(rem) => { setEditing(rem); setShowForm(false); }}
            onDelete={(rem) => remove.mutate(rem.id)}
            onToggle={(rem) => toggle.mutate({ id: rem.id, enabled: !rem.enabled })}
          />
        ))}
      </div>
    </PageContainer>
  );
}