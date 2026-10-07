import { useState } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Trash2, Pencil, Plus, Link2, CalendarClock, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/money';
import { format, isAfter } from 'date-fns';
import {
  getSinkingFundStats,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  TRACKING_LABELS,
  TRACKING_STYLES,
} from '@/lib/sinkingFunds';
import { cn } from '@/lib/utils';

export default function SinkingFundCard({ fund, user, currency, linkedBill, onEdit, onDelete, onAddFunds }) {
  const [addAmount, setAddAmount] = useState('');
  const stats = getSinkingFundStats(fund, user);
  const isCompleted = fund.status === 'completed' || stats.remaining <= 0;
  const isOverdue = fund.target_date && isAfter(new Date(), new Date(fund.target_date)) && !isCompleted;

  const handleAdd = () => {
    const val = parseFloat(addAmount);
    if (val > 0) {
      onAddFunds(fund, val);
      setAddAmount('');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'bg-card rounded-2xl border p-5 space-y-4',
        isCompleted ? 'border-emerald-200' : 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('p-2.5 rounded-xl shrink-0', isCompleted ? 'bg-emerald-50' : 'bg-amber-50')}>
            <PiggyBank className={cn('w-5 h-5', isCompleted ? 'text-emerald-600' : 'text-amber-600')} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate">{fund.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border', PRIORITY_STYLES[fund.priority])}>
                {PRIORITY_LABELS[fund.priority]}
              </span>
              <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border', TRACKING_STYLES[stats.trackingStatus])}>
                {TRACKING_LABELS[stats.trackingStatus]}
              </span>
              {linkedBill && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Link2 className="w-2.5 h-2.5" /> {linkedBill.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(fund)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(fund)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            {formatMoney(fund.current_amount || 0, { currency, decimals: 2 })} of {formatMoney(fund.target_amount, { currency, decimals: 2 })}
          </span>
          <span className="font-medium text-amber-600">{stats.pctFunded.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isCompleted ? 'bg-emerald-500' : 'bg-amber-500')}
            style={{ width: `${Math.min(100, stats.pctFunded)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">
            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className="font-medium">{formatMoney(stats.remaining, { currency, decimals: 2 })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground">Monthly Needed</p>
            <p className="font-medium">{formatMoney(stats.monthlyContribution, { currency, decimals: 2 })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">
            <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground">Target Date</p>
            <p className={cn('font-medium', isOverdue && 'text-red-600')}>
              {fund.target_date ? format(new Date(fund.target_date), 'd MMM yyyy') : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">
            <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground">Projected</p>
            <p className="font-medium">
              {stats.projectedDate ? format(stats.projectedDate, 'd MMM yyyy') : isCompleted ? 'Done' : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Per pay cycle */}
      {stats.perCycleContribution > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatMoney(stats.perCycleContribution, { currency, decimals: 2 })} per pay cycle
        </p>
      )}

      {/* Notes */}
      {fund.notes && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{fund.notes}</p>
      )}

      {/* Add funds */}
      {!isCompleted && (
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder={`Add ${currency}`}
            value={addAmount}
            onChange={e => setAddAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      )}
    </motion.div>
  );
}