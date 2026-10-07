import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_LABELS } from '@/lib/forecast';
import { formatMoney } from '@/lib/money';
import { getDefaultEssential } from '@/lib/essential';
import ScheduledChangesEditor from '@/components/bills/ScheduledChangesEditor';
import { X } from 'lucide-react';

export default function BillForm({ bill, onSubmit, onCancel, currency = '£' }) {
  const [form, setForm] = useState(() => {
    if (bill) {
      return {
        ...bill,
        essential: bill.essential ?? getDefaultEssential(bill.category),
        end_date: bill.end_date || '',
        scheduled_changes: bill.scheduled_changes || [],
      };
    }
    return {
      name: '',
      amount: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      category: 'other',
      frequency: 'monthly',
      is_recurring: true,
      essential: getDefaultEssential('other'),
      scheduled_changes: [],
      is_split: false,
      split_between: 2,
      target_end_date: '',
        remaining_balance: '',
        original_balance: '',
        notes: '',
      contract_start_date: '',
      contract_end_date: '',
      renewal_date: '',
      notice_period_days: '',
      intro_price_end_date: '',
      expected_new_price: '',
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      remaining_balance: form.remaining_balance === '' ? undefined : parseFloat(form.remaining_balance),
      original_balance: form.original_balance === '' ? undefined : parseFloat(form.original_balance),
      contract_start_date: form.contract_start_date || null,
      contract_end_date: form.contract_end_date || null,
      renewal_date: form.renewal_date || null,
      notice_period_days: form.notice_period_days ? parseInt(form.notice_period_days) : null,
      intro_price_end_date: form.intro_price_end_date || null,
      expected_new_price: form.expected_new_price === '' ? undefined : parseFloat(form.expected_new_price),
      end_date: form.end_date || null,
      scheduled_changes: (form.scheduled_changes || [])
        .map(c => ({
          ...c,
          amount: c.amount === '' ? undefined : parseFloat(c.amount),
          effective_date: c.effective_date || null,
          end_date: c.end_date || null,
        }))
        .filter(c => c.effective_date),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-heading">{bill ? 'Edit Bill' : 'Add Bill'}</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Bill Name</Label>
          <Input
            placeholder="e.g. Netflix"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={form.start_date || ''}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>End Date (optional)</Label>
          <Input
            type="date"
            value={form.end_date || ''}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">For temporary bills — stops after this date.</p>
        </div>

        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v, essential: getDefaultEssential(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Frequency</Label>
          <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="four_weekly">Four-Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label>Spending Classification</Label>
          <Select value={String(form.essential)} onValueChange={v => setForm({ ...form, essential: v === 'true' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Essential</SelectItem>
              <SelectItem value="false">Non-essential</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Used in affordability and emergency fund calculations. The default is a suggestion — change it as needed.</p>
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <Switch
            checked={form.is_recurring}
            onCheckedChange={v => setForm({ ...form, is_recurring: v })}
          />
          <Label>Recurring bill</Label>
        </div>

        {(form.category === 'loans' || form.category === 'credit_cards') && (
          <div className="col-span-2">
            <Label>Target end date (payoff goal)</Label>
            <Input
              type="date"
              value={form.target_end_date || ''}
              onChange={e => setForm({ ...form, target_end_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">The date you aim to have this paid off by.</p>
          </div>
        )}

        {(form.category === 'loans' || form.category === 'credit_cards') && (
          <div className="col-span-2">
            <Label>Remaining balance</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.remaining_balance || ''}
              onChange={e => setForm({ ...form, remaining_balance: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">The amount you still owe today. Used to project your payoff timeline.</p>
          </div>
        )}

        {(form.category === 'loans' || form.category === 'credit_cards') && (
          <div className="col-span-2">
            <Label>Original balance (optional)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.original_balance || ''}
              onChange={e => setForm({ ...form, original_balance: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">What you originally borrowed. Used with the remaining balance to track how far you've repaid.</p>
          </div>
        )}

        <div className="col-span-2 flex items-center gap-3">
          <Switch
            checked={form.is_split}
            onCheckedChange={v => setForm({ ...form, is_split: v })}
          />
          <Label>Split this bill</Label>
        </div>

        {form.is_split && (
          <div className="col-span-2">
            <Label>Split between (people)</Label>
            <Input
              type="number"
              min="2"
              max="20"
              value={form.split_between}
              onChange={e => setForm({ ...form, split_between: parseInt(e.target.value) || 2 })}
              required
            />
            {parseFloat(form.amount) > 0 && (
              <p className="text-xs text-primary mt-1">
                Your share: {formatMoney(parseFloat(form.amount) / (parseInt(form.split_between) || 1), { currency, decimals: 2 })} / {(parseInt(form.split_between) || 1)} people
              </p>
            )}
          </div>
        )}

        <div className="col-span-2">
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Add any notes..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>

        <div className="col-span-2 border-t border-border pt-3 mt-1">
          <p className="text-xs font-semibold text-foreground mb-2">Contract & Renewal (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract Start</Label>
              <Input type="date" value={form.contract_start_date || ''} onChange={e => setForm({ ...form, contract_start_date: e.target.value })} />
            </div>
            <div>
              <Label>Contract End</Label>
              <Input type="date" value={form.contract_end_date || ''} onChange={e => setForm({ ...form, contract_end_date: e.target.value })} />
            </div>
            <div>
              <Label>Renewal Date</Label>
              <Input type="date" value={form.renewal_date || ''} onChange={e => setForm({ ...form, renewal_date: e.target.value })} />
            </div>
            <div>
              <Label>Notice Period (days)</Label>
              <Input type="number" min="0" placeholder="e.g. 30" value={form.notice_period_days ?? ''} onChange={e => setForm({ ...form, notice_period_days: e.target.value ? parseInt(e.target.value) : '' })} />
            </div>
            <div>
              <Label>Intro Price Ends</Label>
              <Input type="date" value={form.intro_price_end_date || ''} onChange={e => setForm({ ...form, intro_price_end_date: e.target.value })} />
            </div>
            <div>
              <Label>Expected New Price</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.expected_new_price ?? ''} onChange={e => setForm({ ...form, expected_new_price: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Track renewals and introductory price expiries. The bill amount won't change automatically — you'll be prompted to confirm any new price.</p>
        </div>

        <div className="col-span-2 border-t border-border pt-3 mt-1">
          <p className="text-xs font-semibold text-foreground mb-2">Scheduled Future Changes</p>
          <ScheduledChangesEditor
            changes={form.scheduled_changes || []}
            onChange={c => setForm({ ...form, scheduled_changes: c })}
          />
          <p className="text-xs text-muted-foreground mt-2">Schedule future amount changes (rent increases, renewal prices). Historical amounts are preserved separately.</p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{bill ? 'Update' : 'Add Bill'}</Button>
      </div>
    </form>
  );
}