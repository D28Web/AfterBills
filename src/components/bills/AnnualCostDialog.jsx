import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { formatMoney, roundMoney } from '@/lib/money';
import { calculateAnnualComparison, getMonthlyCost } from '@/lib/annualPayment';
import { AlertTriangle } from 'lucide-react';

/**
 * Quick dialog to add monthly + annual cost info to an existing bill,
 * turning it into an annual-payment opportunity without opening the
 * full bill form.
 */
export default function AnnualCostDialog({ bill, open, onOpenChange, onSave, currency = '£' }) {
  const [monthlyCost, setMonthlyCost] = useState('');
  const [annualCost, setAnnualCost] = useState('');
  const [renewalDate, setRenewalDate] = useState('');

  useEffect(() => {
    if (bill) {
      setMonthlyCost(bill.monthly_cost != null ? String(bill.monthly_cost) : '');
      setAnnualCost(bill.annual_cost != null ? String(bill.annual_cost) : '');
      setRenewalDate(bill.renewal_date || '');
    }
  }, [bill]);

  if (!bill) return null;

  const previewBill = {
    ...bill,
    monthly_cost: monthlyCost === '' ? undefined : parseFloat(monthlyCost),
    annual_cost: annualCost === '' ? undefined : parseFloat(annualCost),
  };
  const comp = calculateAnnualComparison(previewBill);
  const derivedMonthly = monthlyCost === '' ? getMonthlyCost(bill) : parseFloat(monthlyCost);

  const handleSave = () => {
    const data = {
      offers_both_options: true,
      target_payment_method: 'annual',
    };
    if (monthlyCost !== '') data.monthly_cost = roundMoney(parseFloat(monthlyCost));
    if (annualCost !== '') data.annual_cost = roundMoney(parseFloat(annualCost));
    if (renewalDate) data.renewal_date = renewalDate;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Annual payment for {bill.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            Many providers offer a discount for paying annually instead of monthly — insurance, car tax, subscriptions, memberships. Enter both costs to see your potential saving and start building towards it.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monthly cost</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={derivedMonthly > 0 ? formatMoney(derivedMonthly, { currency, decimals: 2 }) : 'e.g. 32'}
                value={monthlyCost}
                onChange={e => setMonthlyCost(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">What you pay per month now</p>
            </div>
            <div>
              <Label>Annual cost</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 340"
                value={annualCost}
                onChange={e => setAnnualCost(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">If paid in one lump sum</p>
            </div>
          </div>

          <div>
            <Label>Next renewal date (optional)</Label>
            <Input
              type="date"
              value={renewalDate}
              onChange={e => setRenewalDate(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">When the next annual payment would be due</p>
          </div>

          {comp.hasData && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paying monthly costs</span>
                <span className="font-medium">{formatMoney(comp.monthlyYearlyCost, { currency, decimals: 2 })}/yr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paying annually costs</span>
                <span className="font-medium">{formatMoney(comp.annualCost, { currency, decimals: 2 })}/yr</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className={comp.annualCheaper ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                  {comp.annualCheaper ? 'You could save' : 'Annual costs more'}
                </span>
                <span className={comp.annualCheaper ? 'text-primary font-bold' : 'text-muted-foreground'}>
                  {comp.annualCheaper
                    ? `${formatMoney(comp.saving, { currency, decimals: 2 })}/yr (${comp.percentageSaving}%)`
                    : `+${formatMoney(Math.abs(comp.saving), { currency, decimals: 2 })}/yr`}
                </span>
              </div>
              {comp.annualCheaper && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective monthly cost</span>
                  <span className="font-medium">{formatMoney(comp.effectiveMonthlyCost, { currency, decimals: 2 })}/mo</span>
                </div>
              )}
            </div>
          )}

          {comp.hasData && !comp.annualCheaper && (
            <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Annual isn't cheaper for this bill right now. You can still save the info for future reference.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={!monthlyCost || !annualCost}>
            Save & track
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}