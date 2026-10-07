import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  INTEREST_TYPE_LABELS,
  hasBalloonPayment,
  usesInterestType,
  isMortgage,
} from '@/lib/financeTracking';

// Conditional finance-specific fields for the Bill form.
// Shown only when a finance_type is selected. Fields adapt to the chosen type.
export default function FinanceFields({ form, setForm }) {
  const ft = form.finance_type;
  if (!ft) return null;

  const set = (key, value) => setForm({ ...form, [key]: value });

  return (
    <div className="col-span-2 border-t border-border pt-3 space-y-3">
      <p className="text-xs font-semibold text-foreground">Finance Details</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Original Amount Borrowed</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.original_balance ?? ''}
            onChange={e => set('original_balance', e.target.value)}
          />
        </div>
        <div>
          <Label>Current Outstanding Balance</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.remaining_balance ?? ''}
            onChange={e => set('remaining_balance', e.target.value)}
          />
        </div>

        <div>
          <Label>Interest Rate (% APR)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g. 5.5"
            value={form.interest_rate ?? ''}
            onChange={e => set('interest_rate', e.target.value)}
          />
        </div>

        {usesInterestType(ft) ? (
          <div>
            <Label>Interest / Rate Type</Label>
            <Select value={form.interest_type || ''} onValueChange={v => set('interest_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {Object.entries(INTEREST_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label>APR (%)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 7.9"
              value={form.apr ?? ''}
              onChange={e => set('apr', e.target.value)}
            />
          </div>
        )}

        <div>
          <Label>Original Term (months)</Label>
          <Input
            type="number"
            placeholder="e.g. 60"
            value={form.original_term_months ?? ''}
            onChange={e => set('original_term_months', e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div>
          <Label>Remaining Term (months)</Label>
          <Input
            type="number"
            placeholder="e.g. 36"
            value={form.remaining_term_months ?? ''}
            onChange={e => set('remaining_term_months', e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>

        <div>
          <Label>Agreement End Date</Label>
          <Input
            type="date"
            value={form.agreement_end_date || ''}
            onChange={e => set('agreement_end_date', e.target.value)}
          />
        </div>

        {isMortgage(ft) && (
          <div>
            <Label>Estimated Property Value</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.property_value ?? ''}
              onChange={e => set('property_value', e.target.value)}
            />
          </div>
        )}

        {isMortgage(ft) && form.interest_type === 'fixed' && (
          <div>
            <Label>Fixed Rate Ends</Label>
            <Input
              type="date"
              value={form.fixed_rate_end_date || ''}
              onChange={e => set('fixed_rate_end_date', e.target.value)}
            />
          </div>
        )}

        {hasBalloonPayment(ft) && (
          <div className="col-span-2">
            <Label>Final / Balloon Payment</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.balloon_payment ?? ''}
              onChange={e => set('balloon_payment', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">The lump sum due at the end of the agreement.</p>
          </div>
        )}
      </div>

      {/* Overpayments */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-foreground mb-2">Overpayments (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Overpayment Amount</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.overpayment_amount ?? ''}
              onChange={e => set('overpayment_amount', e.target.value)}
            />
          </div>
          <div>
            <Label>Overpayment Frequency</Label>
            <Select value={form.overpayment_frequency || ''} onValueChange={v => set('overpayment_frequency', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
        </div>
      </div>

      {/* Early repayment charge */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-foreground mb-2">Early Repayment Charge (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>ERC Amount / %</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.early_repayment_charge ?? ''}
              onChange={e => set('early_repayment_charge', e.target.value)}
            />
          </div>
          <div>
            <Label>ERC Type</Label>
            <Select value={form.early_repayment_charge_type || ''} onValueChange={v => set('early_repayment_charge_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed amount</SelectItem>
                <SelectItem value="percentage">% of balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}