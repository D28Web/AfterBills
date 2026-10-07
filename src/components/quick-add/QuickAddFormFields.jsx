import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_LABELS } from '@/lib/forecast';

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'four_weekly', label: 'Four-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const NAME_PLACEHOLDERS = {
  bill: 'e.g. Netflix',
  income: 'e.g. Salary',
  savings_goal: 'e.g. Holiday Fund',
  sinking_fund: 'e.g. Car Insurance',
  debt: 'e.g. Car Loan',
  one_off: 'e.g. Dentist',
};

// Minimal form fields for Quick Add — only the essentials needed to create
// the item. The full editor is available afterwards for additional details.
export default function QuickAddFormFields({ type, form, setForm }) {
  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target ? e.target.value : e }));
  const setSelect = (key) => (v) => setForm(prev => ({ ...prev, [key]: v }));

  const showAmount = ['bill', 'income', 'debt', 'one_off'].includes(type);
  const showTarget = ['savings_goal', 'sinking_fund'].includes(type);
  const showFreq = ['bill', 'income', 'debt'].includes(type);
  const showCategory = type === 'bill' || type === 'one_off';
  const showDebtType = type === 'debt';
  const showRemainingBalance = type === 'debt';
  const showTargetDate = type === 'sinking_fund';

  return (
    <div className="space-y-3">
      <div>
        <Label>Name</Label>
        <Input
          value={form.name || ''}
          onChange={set('name')}
          required
          autoFocus
          placeholder={NAME_PLACEHOLDERS[type] || 'Name'}
        />
      </div>

      {showAmount && (
        <div>
          <Label>{type === 'debt' ? 'Monthly Payment' : 'Amount'}</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.amount || ''} onChange={set('amount')} required />
        </div>
      )}

      {showTarget && (
        <div>
          <Label>Target Amount</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.target_amount || ''} onChange={set('target_amount')} required />
        </div>
      )}

      {showRemainingBalance && (
        <div>
          <Label>Remaining Balance</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.remaining_balance || ''} onChange={set('remaining_balance')} required />
        </div>
      )}

      {showTargetDate && (
        <div>
          <Label>Target Date</Label>
          <Input type="date" value={form.target_date || ''} onChange={set('target_date')} required />
        </div>
      )}

      {showCategory && (
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={setSelect('category')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS)
                .filter(([key]) => !['loans', 'credit_cards'].includes(key))
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDebtType && (
        <div>
          <Label>Debt Type</Label>
          <Select value={form.category} onValueChange={setSelect('category')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="loans">Loan</SelectItem>
              <SelectItem value="credit_cards">Credit Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showFreq && (
        <div>
          <Label>Frequency</Label>
          <Select value={form.frequency} onValueChange={setSelect('frequency')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FREQ_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}