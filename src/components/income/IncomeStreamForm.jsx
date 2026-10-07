import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import { INCOME_TYPE_LABELS } from '@/lib/income';
import IncomeChangesEditor from '@/components/income/IncomeChangesEditor';
import VariablePeriodsEditor from '@/components/income/VariablePeriodsEditor';

const INCOME_TYPES = Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'four_weekly', label: 'Four-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'irregular', label: 'Irregular' },
];

const DEFAULT = {
  name: '',
  income_type: 'other',
  amount: '',
  frequency: 'monthly',
  start_date: '',
  end_date: '',
  next_payment_date: '',
  is_variable: false,
  variable_forecast_percent: '',
  scheduled_changes: [],
  variable_periods: [],
  notes: '',
};

export default function IncomeStreamForm({ stream, onSubmit, onCancel }) {
  const [form, setForm] = useState(stream ? {
    ...stream,
    amount: stream.amount ?? '',
    start_date: stream.start_date || '',
    end_date: stream.end_date || '',
    next_payment_date: stream.next_payment_date || '',
    is_variable: stream.is_variable || false,
    income_type: stream.income_type || 'other',
    variable_forecast_percent: stream.variable_forecast_percent ?? '',
    scheduled_changes: stream.scheduled_changes || [],
    variable_periods: stream.variable_periods || [],
    notes: stream.notes || '',
  } : DEFAULT);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target ? e.target.value : e }));
  const setSelect = (key) => (v) => setForm(prev => ({ ...prev, [key]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount) || 0,
      end_date: form.end_date || null,
      next_payment_date: form.next_payment_date || null,
      start_date: form.start_date || null,
      variable_forecast_percent: form.variable_forecast_percent === '' ? null : parseFloat(form.variable_forecast_percent),
      scheduled_changes: (form.scheduled_changes || [])
        .map(c => ({
          ...c,
          amount: c.amount === '' ? undefined : parseFloat(c.amount),
          gross_annual: c.gross_annual === '' ? undefined : parseFloat(c.gross_annual),
          effective_date: c.effective_date || null,
          end_date: c.end_date || null,
        }))
        .filter(c => c.effective_date),
      variable_periods: (form.variable_periods || [])
        .map(p => ({
          period_date: p.period_date || null,
          expected_amount: p.expected_amount === '' ? undefined : parseFloat(p.expected_amount),
          confirmed_amount: p.confirmed_amount === '' ? undefined : parseFloat(p.confirmed_amount),
          actual_amount: p.actual_amount === '' ? undefined : parseFloat(p.actual_amount),
        }))
        .filter(p => p.period_date),
    });
  };

  const isIrregular = form.frequency === 'irregular';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-muted/40 rounded-xl border border-border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Name</Label>
          <Input placeholder="e.g. Salary, Freelance, Overtime" value={form.name} onChange={set('name')} required />
        </div>
        <div>
          <Label>Income Type</Label>
          <Select value={form.income_type} onValueChange={setSelect('income_type')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INCOME_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Frequency</Label>
          <Select value={form.frequency} onValueChange={setSelect('frequency')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Amount {isIrregular ? 'per payment' : 'per period'}</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
        </div>
        <div>
          <Label>Next Payment Date</Label>
          <Input type="date" value={form.next_payment_date} onChange={set('next_payment_date')} />
          {isIrregular && <p className="text-xs text-muted-foreground mt-0.5">Required for irregular income</p>}
        </div>
        {!isIrregular && (
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={form.start_date} onChange={set('start_date')} />
          </div>
        )}
        <div>
          <Label>End Date (optional)</Label>
          <Input type="date" value={form.end_date} onChange={set('end_date')} />
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3 bg-card">
          <div>
            <Label>Variable Income</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Amount may vary each period</p>
          </div>
          <Switch checked={form.is_variable} onCheckedChange={setSelect('is_variable')} />
        </div>

        {form.is_variable && (
          <>
            <div className="col-span-2">
              <Label>Conservative Forecast % (optional)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 80"
                value={form.variable_forecast_percent}
                onChange={set('variable_forecast_percent')}
              />
              <p className="text-xs text-muted-foreground mt-0.5">Forecast expected (non-confirmed) amounts at this percentage of their value. Confirmed/actual amounts are used at full value.</p>
            </div>
            <div className="col-span-2">
              <Label>Per-Period Amounts</Label>
              <VariablePeriodsEditor periods={form.variable_periods || []} onChange={p => setForm(prev => ({ ...prev, variable_periods: p }))} />
            </div>
          </>
        )}

        <div className="col-span-2 border-t border-border pt-3">
          <Label>Scheduled Future Changes</Label>
          <div className="mt-2">
            <IncomeChangesEditor changes={form.scheduled_changes || []} onChange={c => setForm(prev => ({ ...prev, scheduled_changes: c }))} incomeMode="net" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Schedule pay rises/reductions, bonuses or temporary overtime for this stream.</p>
        </div>

        <div className="col-span-2">
          <Label>Notes (optional)</Label>
          <Input placeholder="Optional notes" value={form.notes} onChange={set('notes')} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1"><X className="w-3.5 h-3.5" />Cancel</Button>
        <Button type="submit" size="sm" className="gap-1"><Save className="w-3.5 h-3.5" />Save</Button>
      </div>
    </form>
  );
}