import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Plane, Wallet, CheckCircle2, AlertCircle, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import TripExpenseForm from '@/components/trips/TripExpenseForm';
import TripExpenseCard, { getExpenseShare } from '@/components/trips/TripExpenseCard';
import TripPlanCard from '@/components/trips/TripPlanCard';
import TripForm from '@/components/trips/TripForm';
import { getPayCycles } from '@/lib/payday';

export default function TripPlanner() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const currency = user?.currency || '£';

  const { data: expenses = [] } = useQuery({
    queryKey: ['trip-expenses'],
    queryFn: () => base44.entities.TripExpense.list(),
  });

  const [tripFilter, setTripFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TripExpense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip-expenses'] }); setShowAdd(false); toast.success('Expense added'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TripExpense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip-expenses'] }); setEditingExpense(null); toast.success('Expense updated'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TripExpense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip-expenses'] }); toast.success('Expense deleted'); },
  });

  const { data: trips = [] } = useQuery({ queryKey: ['trips'], queryFn: () => base44.entities.Trip.list() });
  const { data: contributions = [] } = useQuery({ queryKey: ['trip-contributions'], queryFn: () => base44.entities.TripContribution.list() });

  const createTrip = useMutation({
    mutationFn: (data) => base44.entities.Trip.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setShowAddTrip(false); toast.success('Trip added'); },
  });
  const updateTrip = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Trip.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setEditingTrip(null); toast.success('Trip updated'); },
  });
  const deleteTrip = useMutation({
    mutationFn: (id) => base44.entities.Trip.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); toast.success('Trip deleted'); },
  });
  const addContribution = useMutation({
    mutationFn: (data) => base44.entities.TripContribution.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip-contributions'] }); toast.success('Contribution added'); },
  });
  const deleteContribution = useMutation({
    mutationFn: (id) => base44.entities.TripContribution.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trip-contributions'] }); toast.success('Contribution deleted'); },
  });

  const tripNames = useMemo(() => [...new Set(expenses.map(e => e.trip_name))], [expenses]);

  const allCycles = useMemo(() => getPayCycles(user, 200), [user]);

  const filtered = useMemo(() => {
    if (tripFilter === 'all') return expenses;
    return expenses.filter(e => e.trip_name === tripFilter);
  }, [expenses, tripFilter]);

  const totalCost = filtered.reduce((s, e) => s + getExpenseShare(e), 0);
  const totalPaid = filtered.filter(e => e.is_paid).reduce((s, e) => s + getExpenseShare(e), 0);
  const totalUnpaid = totalCost - totalPaid;
  const paidCount = filtered.filter(e => e.is_paid).length;

  const unpaidItems = filtered.filter(e => !e.is_paid);
  const paidItems = filtered.filter(e => e.is_paid);

  const togglePaid = (expense) => {
    updateMutation.mutate({
      id: expense.id,
      data: {
        ...expense,
        is_paid: !expense.is_paid,
        paid_date: !expense.is_paid ? (expense.paid_date || new Date().toISOString().slice(0, 10)) : null,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">Trip Planner</h2>
        <p className="text-sm text-muted-foreground mt-1">Track what's paid and what's still to pay for your trips</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Plane className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">Total Cost</span></div>
          <p className="text-2xl font-bold font-heading">{currency}{totalCost.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle2 className="w-4 h-4 text-primary" /><span className="text-xs uppercase tracking-wider">Paid</span></div>
          <p className="text-2xl font-bold font-heading text-primary">{currency}{totalPaid.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertCircle className="w-4 h-4 text-destructive" /><span className="text-xs uppercase tracking-wider">To Pay</span></div>
          <p className="text-2xl font-bold font-heading text-destructive">{currency}{totalUnpaid.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Wallet className="w-4 h-4" /><span className="text-xs uppercase tracking-wider">Progress</span></div>
          <p className="text-2xl font-bold font-heading">{paidCount}/{filtered.length}</p>
        </motion.div>
      </div>

      {/* Trip selector + add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTripFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              tripFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            All Trips
          </button>
          {tripNames.map(name => (
            <button
              key={name}
              onClick={() => setTripFilter(name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                tripFilter === name ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        {!showAdd && !editingExpense && (
          <Button size="sm" className="gap-1 ml-auto" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <TripExpenseForm
          tripName={tripFilter !== 'all' ? tripFilter : ''}
          currency={currency}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* To Pay section */}
      {unpaidItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold font-heading text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> To Pay
          </h3>
          {unpaidItems.map(expense =>
            editingExpense?.id === expense.id ? (
              <TripExpenseForm
                key={expense.id}
                expense={expense}
                currency={currency}
                onSubmit={(data) => updateMutation.mutate({ id: expense.id, data })}
                onCancel={() => setEditingExpense(null)}
              />
            ) : (
              <TripExpenseCard
                key={expense.id}
                expense={expense}
                currency={currency}
                onTogglePaid={togglePaid}
                onEdit={setEditingExpense}
                onDelete={(e) => deleteMutation.mutate(e.id)}
              />
            )
          )}
        </div>
      )}

      {/* Paid section */}
      {paidItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold font-heading text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Paid
          </h3>
          {paidItems.map(expense =>
            editingExpense?.id === expense.id ? (
              <TripExpenseForm
                key={expense.id}
                expense={expense}
                currency={currency}
                onSubmit={(data) => updateMutation.mutate({ id: expense.id, data })}
                onCancel={() => setEditingExpense(null)}
              />
            ) : (
              <TripExpenseCard
                key={expense.id}
                expense={expense}
                currency={currency}
                onTogglePaid={togglePaid}
                onEdit={setEditingExpense}
                onDelete={(e) => deleteMutation.mutate(e.id)}
              />
            )
          )}
        </div>
      )}

      {filtered.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <Plane className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No trip expenses yet — add your first one to get started</p>
        </div>
      )}

      {/* Savings Plan */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" /> Savings Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Plan how to save up for each trip, based on cost minus payments made</p>
          </div>
          {!showAddTrip && !editingTrip && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddTrip(true)}>
              <Plus className="w-3.5 h-3.5" /> New Trip
            </Button>
          )}
        </div>

        {showAddTrip && <TripForm onSubmit={(d) => createTrip.mutate(d)} onCancel={() => setShowAddTrip(false)} />}
        {editingTrip && (
          <TripForm trip={editingTrip} onSubmit={(d) => updateTrip.mutate({ id: editingTrip.id, data: d })} onCancel={() => setEditingTrip(null)} />
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {trips.map(trip => (
            <TripPlanCard
              key={trip.id}
              trip={trip}
              expenses={expenses.filter(e => e.trip_name === trip.name)}
              contributions={contributions}
              user={user}
              currency={currency}
              cycles={allCycles}
              onEditTrip={setEditingTrip}
              onDeleteTrip={(t) => deleteTrip.mutate(t.id)}
              onAddContribution={(d) => addContribution.mutate(d)}
              onDeleteContribution={(c) => deleteContribution.mutate(c.id)}
            />
          ))}
        </div>

        {trips.length === 0 && !showAddTrip && (
          <div className="text-center py-12">
            <PiggyBank className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Create a trip with a target date to start planning your savings</p>
          </div>
        )}
      </div>
    </div>
  );
}