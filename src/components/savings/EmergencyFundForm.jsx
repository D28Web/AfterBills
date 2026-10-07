import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney, roundMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export default function EmergencyFundForm({ existing, monthlyEssential, currency = '£', onSubmit, onCancel }) {
  const [targetType, setTargetType] = useState(existing?.target_type || 'months');
  const [targetMonths, setTargetMonths] = useState(existing?.target_months ? String(existing.target_months) : '3');
  const [targetAmount, setTargetAmount] = useState(existing?.target_amount ? String(existing.target_amount) : '');
  const [currentAmount, setCurrentAmount] = useState(existing?.current_amount ? String(existing.current_amount) : '0');

  const computedTarget = targetType === 'months'
    ? roundMoney(monthlyEssential * (parseFloat(targetMonths) || 0))
    : roundMoney(parseFloat(targetAmount) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: 'Emergency Fund',
      is_emergency_fund: true,
      target_type: targetType,
      target_months: targetType === 'months' ? parseFloat(targetMonths) : null,
      target_amount: computedTarget,
      current_amount: parseFloat(currentAmount) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Target Type</Label>
        <Select value={targetType} onValueChange={setTargetType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="months">Months of essential expenses</SelectItem>
            <SelectItem value="fixed">Fixed amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {targetType === 'months' ? (
        <div>
          <Label>Number of months</Label>
          <div className="flex gap-2 mb-2">
            {[1, 3, 6].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setTargetMonths(String(m))}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  targetMonths === String(m)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                {m} month{m === 1 ? '' : 's'}
              </button>
            ))}
          </div>
          <Input type="number" min="1" step="1" placeholder="Custom" value={targetMonths} onChange={e => setTargetMonths(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">
            Based on {formatMoney(monthlyEssential, { currency, decimals: 2 })}/mo essential expenses · target {formatMoney(computedTarget, { currency, decimals: 2 })}
          </p>
        </div>
      ) : (
        <div>
          <Label>Target Amount</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
        </div>
      )}

      <div>
        <Label>Already Saved</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{existing ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}