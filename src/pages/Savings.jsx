import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast, billToMonthlyCost } from '@/lib/forecast';
import { getPrimaryIncomeContext } from '@/lib/income';
import { Plus, Target, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { addMonths, format } from 'date-fns';

export default function Savings() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '' });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.SavingsGoal.list() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const income = primaryCtx.monthly_income;
  const currency = user?.currency || '£';
  const monthlyBills = bills.reduce((sum, b) => sum + billToMonthlyCost(b), 0);
  const monthlySpare = income - monthlyBills;

  const createMutation = useMutation({
    mutationFn: data => base44.entities.SavingsGoal.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setShowForm(false); setForm({ name: '', target_amount: '', current_amount: '' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SavingsGoal.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavingsGoal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
    });
  };

  const getProjectedDate = (goal) => {
    const remaining = goal.target_amount - (goal.current_amount || 0);
    if (remaining <= 0) return 'Achieved!';
    if (monthlySpare <= 0) return 'Increase income or reduce bills';
    const monthsNeeded = Math.ceil(remaining / monthlySpare);
    return format(addMonths(new Date(), monthsNeeded), 'MMM yyyy');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">Savings Goals</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your progress towards financial goals</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {monthlySpare > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-accent rounded-2xl border border-border p-4">
          <p className="text-sm text-accent-foreground">
            You have approximately <span className="font-bold">{currency}{monthlySpare.toFixed(0)}</span> spare each month for savings
          </p>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {goals.map(goal => {
            const pct = goal.target_amount > 0 ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100) : 0;
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
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{goal.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {currency}{(goal.current_amount || 0).toFixed(0)} of {currency}{goal.target_amount.toFixed(0)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(goal.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Progress value={pct} className="h-2" />

                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">{pct.toFixed(0)}% complete</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {getProjectedDate(goal)}
                  </span>
                </div>

                <div className="flex gap-2">
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
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {goals.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p>No savings goals yet. Create one to start tracking.</p>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold font-heading">New Savings Goal</h3>
            <div>
              <Label>Goal Name</Label>
              <Input placeholder="e.g. Holiday Fund" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Target Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
            </div>
            <div>
              <Label>Already Saved (optional)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Create Goal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}