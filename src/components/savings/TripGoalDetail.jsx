import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Clock, Plane, ChevronDown, ChevronUp, PiggyBank, Trash2 } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { useEffect, useRef } from 'react';
import { getSplitShare, formatMoney, roundMoney, sumMoney } from '@/lib/money';
import { FREQ_TO_MONTHLY } from '@/lib/income';
import TripExpenseForm from '@/components/trips/TripExpenseForm';
import TripExpenseCard from '@/components/trips/TripExpenseCard';
import TripContributionForm from '@/components/trips/TripContributionForm';

/**
 * Expandable detail section for trip-type SavingsGoal cards.
 * Restores the expense tracking, contribution logging, and cost breakdown
 * that existed in the old TripPlanner before trips were merged into Savings.
 *
 * The SavingsGoal's target_amount and current_amount are synced from the
 * sum of expense shares and contributions respectively, so the goal card
 * always reflects the real trip cost and savings progress.
 */
export default function TripGoalDetail({ goal, currency, primaryCtx, onGoalSync }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showContribution, setShowContribution] = useState(false);

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['trip-expenses'],
    queryFn: () => base44.entities.TripExpense.list(),
  });
  const { data: allContributions = [] } = useQuery({
    queryKey: ['trip-contributions'],
    queryFn: () => base44.entities.TripContribution.list(),
  });

  const expenses = allExpenses.filter(e => e.trip_name === goal.name);
  const contributions = allContributions
    .filter(c => c.trip_name === goal.name)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalCost = roundMoney(sumMoney(expenses.map(e => getSplitShare(e))));
  const paidAmount = roundMoney(sumMoney(expenses.filter(e => e.is_paid).map(e => getSplitShare(e))));
  const outstanding = Math.max(0, totalCost - paidAmount);
  const saved = roundMoney(sumMoney(contributions.map(c => parseFloat(c.amount) || 0)));
  const remaining = Math.max(0, totalCost - saved);

  // Per-month and per-cycle savings requirements
  const targetDate = goal.travel_date ? new Date(goal.travel_date) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let perMonth = 0;
  let perCycle = 0;
  if (remaining > 0 && targetDate && !isBefore(targetDate, today)) {
    const monthsRemaining = Math.max(1, (targetDate.getFullYear() * 12 + targetDate.getMonth()) - (today.getFullYear() * 12 + today.getMonth()));
    perMonth = roundMoney(remaining / monthsRemaining);
    const freq = primaryCtx?.pay_frequency || 'monthly';
    const cycleMultiplier = FREQ_TO_MONTHLY[freq] || 1;
    perCycle = roundMoney(perMonth / cycleMultiplier);
  }

  const createExpenseMutation = useMutation({
    mutationFn: data => base44.entities.TripExpense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-expenses'] });
      setShowExpenseForm(false);
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TripExpense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-expenses'] });
      setEditingExpense(null);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: id => base44.entities.TripExpense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip-expenses'] }),
  });

  const togglePaidMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TripExpense.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip-expenses'] }),
  });

  const createContributionMutation = useMutation({
    mutationFn: data => base44.entities.TripContribution.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-contributions'] });
      setShowContribution(false);
    },
  });

  const deleteContributionMutation = useMutation({
    mutationFn: id => base44.entities.TripContribution.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip-contributions'] }),
  });

  // Sync the SavingsGoal whenever expenses or contributions change
  const currentTotalCost = roundMoney(sumMoney(expenses.map(e => getSplitShare(e))));
  const currentSaved = roundMoney(sumMoney(contributions.map(c => parseFloat(c.amount) || 0)));
  const syncRef = useRef(false);
  useEffect(() => {
    if (syncRef.current && (currentTotalCost !== goal.target_amount || currentSaved !== (goal.current_amount || 0))) {
      onGoalSync(goal.id, { target_amount: currentTotalCost, current_amount: currentSaved });
    }
    syncRef.current = true;
  }, [currentTotalCost, currentSaved]);

  const handleAddExpense = (data) => {
    createExpenseMutation.mutate({ ...data, trip_name: goal.name });
  };
  const handleUpdateExpense = (data) => {
    updateExpenseMutation.mutate({ id: editingExpense.id, data });
  };
  const handleDeleteExpense = (expense) => {
    deleteExpenseMutation.mutate(expense.id);
  };
  const handleTogglePaid = (expense) => {
    togglePaidMutation.mutate({
      id: expense.id,
      data: { is_paid: !expense.is_paid, paid_date: !expense.is_paid ? format(today, 'yyyy-MM-dd') : null },
    });
  };
  const handleAddContribution = (data) => {
    createContributionMutation.mutate({ ...data, trip_name: goal.name });
  };
  const handleDeleteContribution = (contrib) => {
    deleteContributionMutation.mutate(contrib.id);
  };

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs font-semibold text-foreground hover:text-primary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5" />
          Trip Details
          {expenses.length > 0 && <span className="text-muted-foreground font-normal">({expenses.length} costs)</span>}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Cost breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/40 rounded-xl p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Cost</p>
              <p className="text-sm font-bold font-heading text-foreground">{formatMoney(totalCost, { currency })}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved</p>
              <p className="text-sm font-bold font-heading text-primary">{formatMoney(saved, { currency })}</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
              <p className="text-sm font-bold font-heading text-destructive">{formatMoney(remaining, { currency })}</p>
            </div>
          </div>

          {paidAmount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {formatMoney(paidAmount, { currency })} already paid · {formatMoney(outstanding, { currency })} outstanding
            </p>
          )}

          {/* Savings rate */}
          {remaining > 0 && perMonth > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-accent/30 rounded-xl p-3 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Save</span>
                <span className="font-bold font-heading text-primary">{formatMoney(perMonth, { currency })}/mo</span>
              </div>
              {perCycle > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{formatMoney(perCycle, { currency })}</span>
                  <span className="text-muted-foreground">/ pay cycle</span>
                </div>
              )}
            </div>
          )}
          {remaining <= 0 && totalCost > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 rounded-xl p-3 text-sm text-primary">
              <PiggyBank className="w-4 h-4" />
              <span className="font-medium">Trip fully funded — you're all set!</span>
            </div>
          )}

          {/* Assigned costs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Costs</span>
              {!showExpenseForm && !editingExpense && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setShowExpenseForm(true); setEditingExpense(null); }}>
                  <Plus className="w-3 h-3" />Add Cost
                </Button>
              )}
            </div>

            {showExpenseForm && (
              <TripExpenseForm
                tripName={goal.name}
                currency={currency}
                onSubmit={handleAddExpense}
                onCancel={() => setShowExpenseForm(false)}
              />
            )}

            {expenses.map(expense =>
              editingExpense?.id === expense.id ? (
                <TripExpenseForm
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                  onSubmit={handleUpdateExpense}
                  onCancel={() => setEditingExpense(null)}
                />
              ) : (
                <TripExpenseCard
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                  onTogglePaid={handleTogglePaid}
                  onEdit={setEditingExpense}
                  onDelete={handleDeleteExpense}
                />
              )
            )}

            {expenses.length === 0 && !showExpenseForm && (
              <p className="text-xs text-muted-foreground">No costs added yet. Add flights, accommodation, activities and more.</p>
            )}
          </div>

          {/* Contributions */}
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
                tripName={goal.name}
                currency={currency}
                onSubmit={handleAddContribution}
                onCancel={() => setShowContribution(false)}
              />
            )}
            {contributions.length === 0 && !showContribution && (
              <p className="text-xs text-muted-foreground">No contributions yet</p>
            )}
            {contributions.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-foreground font-medium">{formatMoney(c.amount, { currency, decimals: 2 })}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.date), 'd MMM yyyy')}</span>
                  {c.notes && <span className="text-xs text-muted-foreground truncate">· {c.notes}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteContribution(c)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}