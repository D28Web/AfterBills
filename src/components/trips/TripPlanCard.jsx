import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Pencil, Trash2, Plus, PiggyBank, TrendingUp, Clock, Plane } from 'lucide-react';
import { differenceInCalendarMonths, format, isBefore } from 'date-fns';
import TripExpenseCard, { getExpenseShare } from '@/components/trips/TripExpenseCard';
import TripExpenseForm from '@/components/trips/TripExpenseForm';
import TripContributionForm from '@/components/trips/TripContributionForm';

export default function TripPlanCard({ trip, expenses, contributions, user, currency, cycles, trips = [], editingExpense, onEditExpense, onTogglePaidExpense, onUpdateExpense, onDeleteExpense, onEditTrip, onDeleteTrip, onAddContribution, onDeleteContribution }) {
  const [showContribution, setShowContribution] = useState(false);

  const totalCost = expenses.reduce((s, e) => s + getExpenseShare(e), 0);
  const paidAmount = expenses.filter(e => e.is_paid).reduce((s, e) => s + getExpenseShare(e), 0);
  const outstanding = Math.max(0, totalCost - paidAmount);

  const tripContributions = contributions.filter(c => c.trip_name === trip.name).sort((a, b) => new Date(b.date) - new Date(a.date));
  const saved = tripContributions.reduce((s, c) => s + c.amount, 0);
  const remaining = Math.max(0, outstanding - saved);

  const targetDate = new Date(trip.target_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pastDue = isBefore(targetDate, today) && remaining > 0;
  const monthsRemaining = Math.max(1, differenceInCalendarMonths(targetDate, today));
  const cyclesRemaining = Math.max(1, cycles.filter(c => new Date(c.start) <= targetDate).length);
  const perMonth = remaining / monthsRemaining;
  const perCycle = remaining / cyclesRemaining;
  const progressPct = outstanding > 0 ? Math.min(100, (saved / outstanding) * 100) : (totalCost > 0 ? 100 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-base font-bold font-heading text-foreground">{trip.name}</h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" /> Save by {format(targetDate, 'd MMM yyyy')}
            {pastDue && <span className="text-destructive ml-1">· past due</span>}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTrip(trip)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteTrip(trip)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/40 rounded-xl p-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</p>
          <p className="text-sm font-bold font-heading text-foreground">{currency}{outstanding.toFixed(0)}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved</p>
          <p className="text-sm font-bold font-heading text-primary">{currency}{saved.toFixed(0)}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className="text-sm font-bold font-heading text-destructive">{currency}{remaining.toFixed(0)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Savings progress</span>
          <span className="font-medium">{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {remaining > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-accent/30 rounded-xl p-3 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Save</span>
            <span className="font-bold font-heading text-primary">{currency}{perMonth.toFixed(0)}/mo</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{currency}{perCycle.toFixed(0)}</span>
            <span className="text-muted-foreground">/ pay cycle</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-primary/10 rounded-xl p-3 text-sm text-primary">
          <PiggyBank className="w-4 h-4" />
          <span className="font-medium">{outstanding > 0 ? 'Trip fully funded — you\'re all set!' : 'Nothing to save for this trip yet.'}</span>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Plane className="w-3.5 h-3.5" /> Assigned Costs ({expenses.length})
          </span>
          {expenses.map(expense =>
            editingExpense?.id === expense.id ? (
              <TripExpenseForm
                key={expense.id}
                expense={expense}
                trips={trips}
                currency={currency}
                onSubmit={(data) => onUpdateExpense(data)}
                onCancel={() => onEditExpense(null)}
              />
            ) : (
              <TripExpenseCard
                key={expense.id}
                expense={expense}
                currency={currency}
                onTogglePaid={onTogglePaidExpense}
                onEdit={onEditExpense}
                onDelete={onDeleteExpense}
              />
            )
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            <PiggyBank className="w-3.5 h-3.5" /> Contributions
          </span>
          {!showContribution && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setShowContribution(true)}>
              <Plus className="w-3 h-3" />Add
            </Button>
          )}
        </div>
        {showContribution && (
          <TripContributionForm
            tripName={trip.name}
            currency={currency}
            onSubmit={(data) => { onAddContribution(data); setShowContribution(false); }}
            onCancel={() => setShowContribution(false)}
          />
        )}
        {tripContributions.length === 0 && !showContribution && (
          <p className="text-xs text-muted-foreground">No contributions yet</p>
        )}
        {tripContributions.map(c => (
          <div key={c.id} className="flex items-center justify-between text-sm py-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-foreground font-medium">{currency}{c.amount.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(c.date), 'd MMM yyyy')}</span>
              {c.notes && <span className="text-xs text-muted-foreground truncate">· {c.notes}</span>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDeleteContribution(c)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}