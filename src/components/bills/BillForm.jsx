import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CATEGORY_LABELS } from '@/lib/forecast';
import { formatMoney } from '@/lib/money';
import { getDefaultEssential } from '@/lib/essential';
import ScheduledChangesEditor from '@/components/bills/ScheduledChangesEditor';
import AttachmentsField from '@/components/common/AttachmentsField';
import AmountHistoryEditor from '@/components/bills/AmountHistoryEditor';
import FinanceFields from '@/components/bills/FinanceFields';
import { FINANCE_TYPE_LABELS, FINANCE_TYPE_KEYS } from '@/lib/financeTracking';
import { ChevronDown } from 'lucide-react';

export default function BillForm({ bill, onSubmit, onCancel, currency = '£' }) {
  const [form, setForm] = useState(() => {
    if (bill) {
      return {
        ...bill,
        essential: bill.essential ?? getDefaultEssential(bill.category),
        end_date: bill.end_date || '',
        is_salary_sacrifice: bill.is_salary_sacrifice || false,
        bill_assignment: bill.bill_assignment || 'personal',
        scheduled_changes: bill.scheduled_changes || [],
        amount_history: bill.amount_history || [],
        attachments: bill.attachments || [],
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
      is_salary_sacrifice: false,
      bill_assignment: 'personal',
      scheduled_changes: [],
      amount_history: [],
      is_split: false,
      split_between: 2,
      target_end_date: '',
      remaining_balance: '',
      original_balance: '',
      finance_type: '',
      interest_rate: '',
      interest_type: '',
      apr: '',
      original_term_months: '',
      remaining_term_months: '',
      agreement_end_date: '',
      balloon_payment: '',
      overpayment_amount: '',
      overpayment_frequency: '',
      early_repayment_charge: '',
      early_repayment_charge_type: '',
      property_value: '',
      fixed_rate_end_date: '',
      notes: '',
      attachments: [],
      contract_start_date: '',
      contract_end_date: '',
      renewal_date: '',
      notice_period_days: '',
      intro_price_end_date: '',
      expected_new_price: '',
    };
  });

  // Auto-expand optional section when editing a bill that has optional data
  const [optionalOpen, setOptionalOpen] = useState(() => {
    if (!bill) return false;
    return !!(bill.end_date || bill.is_split || bill.notes ||
      (bill.attachments && bill.attachments.length) ||
      bill.contract_start_date || bill.contract_end_date || bill.renewal_date ||
      bill.intro_price_end_date || bill.expected_new_price ||
      (bill.scheduled_changes && bill.scheduled_changes.length) ||
      bill.remaining_balance != null || bill.original_balance != null || bill.target_end_date ||
      bill.finance_type);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      remaining_balance: form.remaining_balance === '' ? undefined : parseFloat(form.remaining_balance),
      original_balance: form.original_balance === '' ? undefined : parseFloat(form.original_balance),
      finance_type: form.finance_type || undefined,
      interest_rate: form.interest_rate === '' ? undefined : parseFloat(form.interest_rate),
      interest_type: form.interest_type || undefined,
      apr: form.apr === '' ? undefined : parseFloat(form.apr),
      original_term_months: form.original_term_months === '' ? undefined : parseInt(form.original_term_months),
      remaining_term_months: form.remaining_term_months === '' ? undefined : parseInt(form.remaining_term_months),
      agreement_end_date: form.agreement_end_date || null,
      balloon_payment: form.balloon_payment === '' ? undefined : parseFloat(form.balloon_payment),
      overpayment_amount: form.overpayment_amount === '' ? undefined : parseFloat(form.overpayment_amount),
      overpayment_frequency: form.overpayment_frequency || undefined,
      early_repayment_charge: form.early_repayment_charge === '' ? undefined : parseFloat(form.early_repayment_charge),
      early_repayment_charge_type: form.early_repayment_charge_type || undefined,
      property_value: form.property_value === '' ? undefined : parseFloat(form.property_value),
      fixed_rate_end_date: form.fixed_rate_end_date || null,
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

  const isLoan = form.category === 'loans' || form.category === 'credit_cards';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold font-heading">{bill ? 'Edit Bill' : 'Add Bill'}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Bill Name</Label>
          <Input placeholder="e.g. Netflix" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>

        <div>
          <Label>Amount</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        </div>

        <div>
          <Label>Start Date</Label>
          <Input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
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

        <div className="sm:col-span-2">
          <Label>Spending Classification</Label>
          <Select value={String(form.essential)} onValueChange={v => setForm({ ...form, essential: v === 'true' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Essential</SelectItem>
              <SelectItem value="false">Non-essential</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label>Finance Type (optional)</Label>
          <Select value={form.finance_type || 'none'} onValueChange={v => setForm({ ...form, finance_type: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not a financed commitment</SelectItem>
              {FINANCE_TYPE_KEYS.map(key => (
                <SelectItem key={key} value={key}>{FINANCE_TYPE_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Track the underlying balance, interest, and progress towards repayment.</p>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <Switch checked={form.is_recurring} onCheckedChange={v => setForm({ ...form, is_recurring: v })} />
          <Label>Recurring bill</Label>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <Switch checked={form.is_salary_sacrifice} onCheckedChange={v => setForm({ ...form, is_salary_sacrifice: v })} />
          <Label>Salary sacrifice (pre-tax deduction)</Label>
        </div>
        {form.is_salary_sacrifice && (
          <p className="sm:col-span-2 text-xs text-muted-foreground -mt-2">
            Shown separately from regular bills and not deducted again from take-home pay.
          </p>
        )}
      </div>

      <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary w-full py-2 border-t border-border hover:text-primary/80 transition-colors">
          <ChevronDown className={`w-4 h-4 transition-transform ${optionalOpen ? '' : '-rotate-90'}`} />
          Optional details
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="sm:col-span-2">
              <Label>End Date (optional)</Label>
              <Input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">For temporary bills — stops after this date.</p>
            </div>

            {isLoan && (
              <div className="sm:col-span-2">
                <Label>Target end date (payoff goal)</Label>
                <Input type="date" value={form.target_end_date || ''} onChange={e => setForm({ ...form, target_end_date: e.target.value })} />
              </div>
            )}
            {form.finance_type ? (
              <FinanceFields form={form} setForm={setForm} />
            ) : isLoan ? (
              <>
                <div className="sm:col-span-2">
                  <Label>Remaining balance</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.remaining_balance || ''} onChange={e => setForm({ ...form, remaining_balance: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Original balance (optional)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={form.original_balance || ''} onChange={e => setForm({ ...form, original_balance: e.target.value })} />
                </div>
              </>
            ) : null}

            <div className="sm:col-span-2 flex items-center gap-3">
              <Switch checked={form.is_split} onCheckedChange={v => setForm({ ...form, is_split: v })} />
              <Label>Split this bill</Label>
            </div>
            {form.is_split && (
              <div className="sm:col-span-2">
                <Label>Split between (people)</Label>
                <Input type="number" min="2" max="20" value={form.split_between} onChange={e => setForm({ ...form, split_between: parseInt(e.target.value) || 2 })} required />
                {parseFloat(form.amount) > 0 && (
                  <p className="text-xs text-primary mt-1">
                    Your share: {formatMoney(parseFloat(form.amount) / (parseInt(form.split_between) || 1), { currency, decimals: 2 })} / {parseInt(form.split_between) || 1} people
                  </p>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Add any notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <div className="sm:col-span-2">
              <AttachmentsField attachments={form.attachments || []} onChange={atts => setForm({ ...form, attachments: atts })} />
            </div>

            <div className="sm:col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-foreground mb-2">Contract & Renewal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            <div className="sm:col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-foreground mb-2">Scheduled Future Changes</p>
              <ScheduledChangesEditor changes={form.scheduled_changes || []} onChange={c => setForm({ ...form, scheduled_changes: c })} />
              <p className="text-xs text-muted-foreground mt-2">Schedule future amount changes (rent increases, renewal prices).</p>
            </div>

            {form.amount_history?.length > 0 && (
              <div className="sm:col-span-2 border-t border-border pt-3">
                <AmountHistoryEditor
                  history={form.amount_history}
                  currency={currency}
                  onChange={h => setForm({ ...form, amount_history: h })}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{bill ? 'Update' : 'Add Bill'}</Button>
      </div>
    </form>
  );
}