import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { billToMonthlyCost } from '@/lib/forecast';
import { getPrimaryIncomeContext } from '@/lib/income';
import { formatMoney, sumMoney, roundMoney, getSplitShare } from '@/lib/money';
import { getRegularBills } from '@/lib/salarySacrifice';
import { Plus, Target, Calendar, Trash2, Pencil, Plane } from 'lucide-react';
import EmergencyFundCard from '@/components/savings/EmergencyFundCard';
import SavingsGoalForm from '@/components/savings/SavingsGoalForm';
import TripGoalDetail from '@/components/savings/TripGoalDetail';
import { getMonthlyEssentialExpenses } from '@/lib/essential';
import { getMilestones } from '@/lib/insights';
import MilestonesStrip from '@/components/insights/MilestonesStrip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { addMonths, format, differenceInDays } from 'date-fns';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { logActivity } from '@/lib/activityLog';
import { toast } from 'sonner';

const TYPE_ICONS = {
  general: Target, emergency_fund: Target, trip: Plane,
  car: Target, home: Target, christmas: Target,
  annual_expense: Target, other: Target,
};

const TYPE_LABELS = {
  general: 'General', emergency_fund: 'Emergency Fund', trip: 'Trip',
  car: 'Car', home: 'Home', christmas: 'Christmas',
  annual_expense: 'Annual Expense', other: 'Other',
};

export default function Savings() {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const queryClient = useQueryClient();
  const migrationRef = useRef(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.SavingsGoal.list() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });

  // Trip migration queries
  const { data: trips = [] } = useQuery({ queryKey: ['trips'], queryFn: () => base44.entities.Trip.list() });
  const { data: tripExpenses = [] } = useQuery({ queryKey: ['trip-expenses'], queryFn: () => base44.entities.TripExpense.list() });
  const { data: tripContributions = [] } = useQuery({ queryKey: ['trip-contributions'], queryFn: () => base44.entities.TripContribution.list() });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const income = primaryCtx.monthly_income;
  const currency = user?.currency || '£';
  const regularBills = getRegularBills(bills);
  const monthlyBills = sumMoney(regularBills.map(b => billToMonthlyCost(b)));
  const monthlySpare = roundMoney(income - monthlyBills);
  const monthlyEssential = getMonthlyEssentialExpenses(regularBills);
  const emergencyGoal = goals.find(g => g.is_emergency_fund || g.type === 'emergency_fund');
  const regularGoals = goals.filter(g => !g.is_emergency_fund && g.type !== 'emergency_fund');
  const allMilestones = getMilestones({ goals, bills: regularBills, emergencyGoal, primaryCtx, monthlySpare, currency });
  const savingsMilestones = allMilestones.filter(m => m.type === 'savings' || m.type === 'emergency');

  const createMutation = useMutation({
    mutationFn: data => base44.entities.SavingsGoal.create(data),
    onSuccess: (_res, data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      logActivity('savings_target_changed', 'savings_goal', data.name, `Created savings goal "${data.name}"`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavingsGoal.update(id, data),
    onSuccess: (_res, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      logActivity('savings_target_changed', 'savings_goal', data.name, `Updated savings goal "${data.name}"`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SavingsGoal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  // Silent sync for trip goals — updates target/current from expenses & contributions
  // without logging an activity entry (the expense/contribution itself is the activity)
  const syncMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavingsGoal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
  const handleGoalSync = (goalId, data) => syncMutation.mutate({ id: goalId, data });

  // Trip migration: move existing Trip records into SavingsGoal with type='trip'
  useEffect(() => {
    if (migrationRef.current) return;
    if (!trips || trips.length === 0) return;
    migrationRef.current = true;
    const existingTripGoals = goals.filter(g => g.type === 'trip');
    const tripsToMigrate = trips.filter(trip => !existingTripGoals.some(g => g.name === trip.name));
    if (tripsToMigrate.length === 0) return;
    tripsToMigrate.forEach(trip => {
      const exp = tripExpenses.filter(e => e.trip_name === trip.name);
      const contribs = tripContributions.filter(c => c.trip_name === trip.name);
      const totalCost = roundMoney(sumMoney(exp.map(e => getSplitShare(e))));
      const totalSaved = roundMoney(sumMoney(contribs.map(c => parseFloat(c.amount) || 0)));
      createMutation.mutate({
        name: trip.name, type: 'trip', target_amount: totalCost || 0,
        current_amount: totalSaved, travel_date: trip.target_date || null,
        notes: trip.notes || null, is_emergency_fund: false,
      });
    });
    toast.success(`${tripsToMigrate.length} trip(s) migrated to Savings`);
  }, [trips, goals, tripExpenses, tripContributions]);

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
      setEditingGoal(null);
      setShowForm(false);
    } else {
      createMutation.mutate(data);
      setShowForm(false);
    }
  };

  const getProjectedDate = (goal) => {
    const remaining = goal.target_amount - (goal.current_amount || 0);
    if (remaining <= 0) return 'Achieved!';
    if (monthlySpare <= 0) return 'Increase income or reduce bills';
    const monthsNeeded = Math.ceil(remaining / monthlySpare);
    return format(addMonths(new Date(), monthsNeeded), 'MMM yyyy');
  };

  const getTripInfo = (goal) => {
    if (goal.type !== 'trip' || !goal.travel_date) return null;
    const today = new Date();
    const travelDate = new Date(goal.travel_date);
    const daysUntilTravel = differenceInDays(travelDate, today);
    const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
    const monthsUntilTravel = Math.max(0, (travelDate.getFullYear() - today.getFullYear()) * 12 + (travelDate.getMonth() - today.getMonth()));
    const requiredMonthly = monthsUntilTravel > 0 ? roundMoney(remaining / monthsUntilTravel) : remaining;
    return {
      daysUntilTravel, requiredMonthly,
      isOverdue: daysUntilTravel < 0 && remaining > 0,
      isAchieved: remaining <= 0,
    };
  };

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Savings Goals"
        subtitle="Track your progress towards financial goals"
        actions={
          <Button onClick={() => { setEditingGoal(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Goal
          </Button>
        }
      />

      {monthlySpare > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-accent rounded-2xl border border-border p-4">
          <p className="text-sm text-accent-foreground">
            You have approximately <span className="font-bold">{formatMoney(monthlySpare, { currency })}</span> spare each month for savings
          </p>
        </motion.div>
      )}

      {savingsMilestones.length > 0 && <MilestonesStrip milestones={savingsMilestones} />}

      <EmergencyFundCard
        goal={emergencyGoal}
        bills={regularBills}
        monthlySpare={monthlySpare}
        primaryCtx={primaryCtx}
        currency={currency}
        monthlyEssential={monthlyEssential}
        onCreate={(data) => createMutation.mutate(data)}
        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {regularGoals.map(goal => {
            const pct = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
            const Icon = TYPE_ICONS[goal.type || 'general'] || Target;
            const tripInfo = getTripInfo(goal);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card rounded-2xl border border-border p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{goal.name}</h4>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                          {TYPE_LABELS[goal.type || 'general'] || 'General'}
                        </span>
                        {goal.destination && <span className="text-xs text-muted-foreground">· {goal.destination}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingGoal(goal); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(goal.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatMoney(goal.current_amount || 0, { currency, decimals: 2 })} of {formatMoney(goal.target_amount, { currency, decimals: 2 })}
                </p>

                <Progress value={pct} className="h-2" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">{pct.toFixed(0)}% complete</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {tripInfo
                      ? (tripInfo.isAchieved ? 'Achieved!' : tripInfo.isOverdue ? 'Overdue' : `${tripInfo.daysUntilTravel} days to go`)
                      : getProjectedDate(goal)}
                  </span>
                </div>

                {tripInfo && !tripInfo.isAchieved && !tripInfo.isOverdue && tripInfo.requiredMonthly > 0 && (
                  <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg p-2">
                    <span className="text-muted-foreground">Required: {formatMoney(tripInfo.requiredMonthly, { currency, decimals: 2 })}/mo</span>
                    <span className={monthlySpare >= tripInfo.requiredMonthly ? 'text-primary font-medium' : 'text-destructive font-medium'}>
                      {monthlySpare >= tripInfo.requiredMonthly ? 'On track' : 'Behind'}
                    </span>
                  </div>
                )}

                <Input
                  type="number"
                  placeholder={`Add ${currency}`}
                  className="h-8 text-xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = parseFloat(e.target.value);
                      if (val > 0) {
                        updateMutation.mutate({ id: goal.id, data: { current_amount: (goal.current_amount || 0) + val } });
                        e.target.value = '';
                      }
                    }
                  }}
                />

                {goal.type === 'trip' && (
                  <TripGoalDetail
                    goal={goal}
                    currency={currency}
                    primaryCtx={primaryCtx}
                    onGoalSync={handleGoalSync}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {regularGoals.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>No savings goals yet. Create one to start tracking.</p>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditingGoal(null); }}>
        <DialogContent className="max-w-sm">
          <SavingsGoalForm
            goal={editingGoal}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingGoal(null); }}
            currency={currency}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}