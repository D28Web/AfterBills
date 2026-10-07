import { useState } from 'react';
import { Shield, Pencil, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { formatMoney } from '@/lib/money';
import { getEmergencyFundStats } from '@/lib/emergencyFund';
import EmergencyFundForm from './EmergencyFundForm';

export default function EmergencyFundCard({ goal, bills, monthlySpare, primaryCtx, currency = '£', monthlyEssential, onCreate, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);

  if (!goal || showForm) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-primary/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading">Emergency Fund</h3>
            <p className="text-xs text-muted-foreground">{goal ? 'Edit your emergency fund' : 'Set up your emergency fund'}</p>
          </div>
        </div>
        <EmergencyFundForm
          existing={goal}
          monthlyEssential={monthlyEssential}
          currency={currency}
          onSubmit={(data) => {
            if (goal) onUpdate(goal.id, data);
            else onCreate(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      </motion.div>
    );
  }

  const stats = getEmergencyFundStats(goal, bills, monthlySpare, primaryCtx);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Emergency Fund</h4>
            <p className="text-xs text-muted-foreground">
              {goal.target_type === 'months'
                ? `${goal.target_months} month${goal.target_months === 1 ? '' : 's'} of essential expenses`
                : 'Fixed target'}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForm(true)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(goal.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold font-heading text-primary">{formatMoney(stats.current, { currency, decimals: 2 })}</span>
          <span className="text-xs text-muted-foreground">of {formatMoney(stats.target, { currency, decimals: 2 })}</span>
        </div>
        <Progress value={stats.pctComplete} className="h-2" />
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-primary font-medium">{stats.pctComplete.toFixed(0)}% complete</span>
          <span className="text-muted-foreground">{stats.monthsCovered} month{stats.monthsCovered === 1 ? '' : 's'} covered</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-muted-foreground">Remaining</p>
          <p className="text-sm font-semibold mt-0.5">{formatMoney(stats.remaining, { currency, decimals: 2 })}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-muted-foreground">Essential / mo</p>
          <p className="text-sm font-semibold mt-0.5">{formatMoney(stats.monthlyEssential, { currency, decimals: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-muted-foreground">Suggested / month</p>
          <p className="text-sm font-semibold mt-0.5 text-primary">{formatMoney(stats.suggestedMonthly, { currency, decimals: 2 })}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-muted-foreground">Suggested / cycle</p>
          <p className="text-sm font-semibold mt-0.5 text-primary">{formatMoney(stats.suggestedPerCycle, { currency, decimals: 2 })}</p>
        </div>
      </div>

      {stats.estimatedCompletion && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Estimated completion: {format(stats.estimatedCompletion, 'MMM yyyy')}</span>
        </div>
      )}
      {stats.remaining > 0 && stats.suggestedMonthly <= 0 && (
        <p className="text-xs text-destructive">Increase income or reduce bills to make progress.</p>
      )}

      <Input
        type="number"
        placeholder={`Add ${currency} to fund`}
        className="h-8 text-xs"
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const val = parseFloat(e.target.value);
            if (val > 0) {
              onUpdate(goal.id, { current_amount: (goal.current_amount || 0) + val });
              e.target.value = '';
            }
          }
        }}
      />
    </motion.div>
  );
}