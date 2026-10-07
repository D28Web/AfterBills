import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import {
  INTEREST_TYPE_LABELS,
  hasBalloonPayment,
  usesInterestType,
  isMortgage,
  generateOutstandingBalance,
} from '@/lib/financeTracking';
import { calculateRemainingMonths, formatTerm } from '@/lib/mortgageCalculations';
import { Calculator } from 'lucide-react';

// Conditional finance-specific fields for the Bill form.
// Shown only when a finance_type is selected. Fields adapt to the chosen type.
export default function FinanceFields({ form, setForm }) {
  const ft = form.finance_type;
  if (!ft) return null;

  const set = (key, value) => setForm({ ...form, [key]: value });

  return (
    <div className="sm:col-span-2 border-t border-border pt-3 space-y-3">
      <p className="text-xs font-semibold text-foreground">Finance Details</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          {(() => {
            const gen = generateOutstandingBalance(form);
            if (!gen) return null;
            const matches = Number.isFinite(parseFloat(form.remaining_balance)) &&
              Math.abs(parseFloat(form.remaining_balance) - gen.remainingBalance) < 0.01;
            return (
              <button
                type="button"
                onClick={() => set('remaining_balance', gen.remainingBalance)}
                className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Calculator className="w-3 h-3" />
                {matches
                  ? `Generated: ${gen.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${gen.paymentsMade} payments, ${gen.totalInterestPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} interest)`
                  : `Calculate from payments: ${gen.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </button>
            );
          })()}
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
          <Label>{isMortgage(ft) ? 'Original Term (years)' : 'Original Term (months)'}</Label>
          <Input
            type="number"
            step={isMortgage(ft) ? '0.5' : '1'}
            placeholder={isMortgage(ft) ? 'e.g. 25' : 'e.g. 60'}
            value={isMortgage(ft)
              ? (form.original_term_months ? Math.round(form.original_term_months / 12 * 10) / 10 : '')
              : (form.original_term_months ?? '')}
            onChange={e => {
              if (isMortgage(ft)) {
                set('original_term_months', e.target.value ? Math.round(parseFloat(e.target.value) * 12) : '');
              } else {
                set('original_term_months', e.target.value ? parseInt(e.target.value) : '');
              }
            }}
          />
        </div>
        <div>
          <Label>{isMortgage(ft) ? 'Remaining Term (years)' : 'Remaining Term (months)'}</Label>
          <Input
            type="number"
            step={isMortgage(ft) ? '0.5' : '1'}
            placeholder={isMortgage(ft) ? 'e.g. 21' : 'e.g. 36'}
            value={isMortgage(ft)
              ? (form.remaining_term_months ? Math.round(form.remaining_term_months / 12 * 10) / 10 : '')
              : (form.remaining_term_months ?? '')}
            onChange={e => {
              if (isMortgage(ft)) {
                set('remaining_term_months', e.target.value ? Math.round(parseFloat(e.target.value) * 12) : '');
              } else {
                set('remaining_term_months', e.target.value ? parseInt(e.target.value) : '');
              }
            }}
          />
          {isMortgage(ft) && form.start_date && form.original_term_months && (
            <p className="text-xs text-muted-foreground mt-1">
              Started {format(new Date(form.start_date), 'MMM yyyy')} · {Math.round((new Date() - new Date(form.start_date)) / (1000 * 60 * 60 * 24 * 365) * 10) / 10} years elapsed
            </p>
          )}
          {isMortgage(ft) && !form.remaining_term_months && form.remaining_balance && form.interest_rate && form.amount && (() => {
            const calc = calculateRemainingMonths(parseFloat(form.remaining_balance), parseFloat(form.interest_rate), parseFloat(form.amount));
            return calc != null ? (
              <p className="text-xs text-primary mt-1">
                Auto-calculated: {formatTerm(calc)} (from balance, rate & payment)
              </p>
            ) : null;
          })()}
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

        {isMortgage(ft) && (
          <div className="sm:col-span-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground mb-2">Current Mortgage Deal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Deal Start Date</Label>
                <Input
                  type="date"
                  value={form.mortgage_deal_start_date || ''}
                  onChange={e => set('mortgage_deal_start_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Deal End Date</Label>
                <Input
                  type="date"
                  value={form.mortgage_deal_end_date || form.fixed_rate_end_date || ''}
                  onChange={e => set('mortgage_deal_end_date', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Quick Set Deal Length</Label>
                <div className="flex gap-2 flex-wrap">
                  {[2, 3, 5].map(yrs => (
                    <button
                      key={yrs}
                      type="button"
                      onClick={() => {
                        const start = form.mortgage_deal_start_date || new Date().toISOString().slice(0, 10);
                        const end = new Date(start);
                        end.setFullYear(end.getFullYear() + yrs);
                        setForm({ ...form, mortgage_deal_start_date: start, mortgage_deal_end_date: end.toISOString().slice(0, 10) });
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {yrs} years
                    </button>
                  ))}
                </div>
                {form.mortgage_deal_start_date && form.mortgage_deal_end_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((new Date(form.mortgage_deal_end_date) - new Date(form.mortgage_deal_start_date)) / (1000 * 60 * 60 * 24 * 365.25) * 10) / 10} year deal
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasBalloonPayment(ft) && (
          <div className="sm:col-span-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          {isMortgage(ft) && (
            <div className="sm:col-span-2">
              <Label>Annual Overpayment Allowance (lender limit without ERC)</Label>
              <Input
                type="number"
                step="100"
                placeholder="e.g. 10000"
                value={form.annual_overpayment_allowance ?? ''}
                onChange={e => set('annual_overpayment_allowance', e.target.value ? parseFloat(e.target.value) : '')}
              />
              <p className="text-xs text-muted-foreground mt-1">The amount your lender allows you to overpay per year without early repayment charges.</p>
            </div>
          )}
        </div>
      </div>

      {/* Early repayment charge */}
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-foreground mb-2">Early Repayment Charge (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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