import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/money';
import { calculateAnnualComparison, getMonthlyCost, getAnnualCost } from '@/lib/annualPayment';

/**
 * Annual vs monthly payment fields shown in the BillForm optional section.
 * Lets the user enter both costs, mark whether the provider offers both
 * options, and set a target payment method.
 */
export default function AnnualPaymentFields({ form, setForm, currency = '£' }) {
  const update = (patch) => setForm({ ...form, ...patch });

  // Live preview of the comparison
  const previewBill = {
    ...form,
    amount: parseFloat(form.amount) || 0,
    monthly_cost: form.monthly_cost === '' ? undefined : parseFloat(form.monthly_cost),
    annual_cost: form.annual_cost === '' ? undefined : parseFloat(form.annual_cost),
  };
  const comp = calculateAnnualComparison(previewBill);
  const hasPreview = comp.hasData;

  return (
    <div className="sm:col-span-2 border-t border-border pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Annual vs Monthly Payment</p>
        <Switch
          checked={form.offers_both_options || false}
          onCheckedChange={v => update({ offers_both_options: v })}
        />
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Compare paying this bill monthly vs annually and build towards the cheaper option.
      </p>

      {form.offers_both_options && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Monthly cost (if paid monthly)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 32"
                value={form.monthly_cost ?? ''}
                onChange={e => update({ monthly_cost: e.target.value })}
              />
            </div>
            <div>
              <Label>Annual cost (if paid annually)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 340"
                value={form.annual_cost ?? ''}
                onChange={e => update({ annual_cost: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Target payment method</Label>
            <Select
              value={form.target_payment_method || 'none'}
              onValueChange={v => update({ target_payment_method: v === 'none' ? undefined : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No target</SelectItem>
                <SelectItem value="monthly">Build towards monthly</SelectItem>
                <SelectItem value="annual">Build towards annual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Set to "annual" if you want to gradually build towards paying annually.
            </p>
          </div>

          {hasPreview && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly yearly cost</span>
                <span className="font-medium">{formatMoney(comp.monthlyYearlyCost, { currency, decimals: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual cost</span>
                <span className="font-medium">{formatMoney(comp.annualCost, { currency, decimals: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className={comp.annualCheaper ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                  {comp.annualCheaper ? 'Annual saving' : 'Annual is not cheaper'}
                </span>
                <span className={comp.annualCheaper ? 'text-primary font-bold' : 'text-muted-foreground'}>
                  {comp.annualCheaper
                    ? `${formatMoney(comp.saving, { currency, decimals: 2 })}/yr (${comp.percentageSaving}%)`
                    : `+${formatMoney(Math.abs(comp.saving), { currency, decimals: 2 })}/yr more`}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}