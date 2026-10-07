import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ShoppingBag, TrendingDown, Receipt, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatMoney, sumMoney } from '@/lib/money';
import { EXPENSE_CATEGORIES, getCategoryMeta, PERIOD_OPTIONS, isInPeriod } from '@/lib/expenses';
import { logActivity } from '@/lib/activityLog';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpenseCard from '@/components/expenses/ExpenseCard';

export default function Expenses() {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [period, setPeriod] = useState('this_month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });

  const currency = user?.currency || '£';

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Expense.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const closeForm = () => { setShowForm(false); setEditingExpense(null); };

  const handleSubmit = (data) => {
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
      closeForm();
    } else {
      createMutation.mutate(data);
      logActivity('bill_created', 'bill', data.name, `Logged expense "${data.name}"`);
    }
  };

  const handleEdit = (expense) => { setEditingExpense(expense); setShowForm(true); };
  const handleDelete = (expense) => {
    if (confirm(`Delete "${expense.name}"?`)) deleteMutation.mutate(expense.id);
  };

  // Expenses in the selected period, sorted newest first.
  const periodExpenses = useMemo(
    () => expenses
      .filter(e => isInPeriod(e, period))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [expenses, period],
  );

  // Category breakdown for the period.
  const categoryBreakdown = useMemo(() => {
    const totals = {};
    periodExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount || 0);
    });
    return EXPENSE_CATEGORIES
      .map(c => ({ ...c, total: totals[c.value] || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [periodExpenses]);

  const periodTotal = sumMoney(periodExpenses.map(e => e.amount));
  const filteredExpenses = categoryFilter === 'all'
    ? periodExpenses
    : periodExpenses.filter(e => e.category === categoryFilter);
  const avgExpense = periodExpenses.length > 0 ? periodTotal / periodExpenses.length : 0;

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Log one-off spending and see where your money goes"
        actions={
          <Button onClick={() => { setEditingExpense(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Log Expense
          </Button>
        }
      />

      {/* Period filter */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              period === opt.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Total Spent</span>
          </div>
          <p className="text-xl font-bold font-heading">{formatMoney(periodTotal, { currency, decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{PERIOD_OPTIONS.find(p => p.value === period)?.label}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-medium">Transactions</span>
          </div>
          <p className="text-xl font-bold font-heading">{periodExpenses.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {periodExpenses.length === 1 ? 'expense' : 'expenses'} logged
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Average</span>
          </div>
          <p className="text-xl font-bold font-heading">{formatMoney(avgExpense, { currency, decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">per expense</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-xs font-medium">Top Category</span>
          </div>
          <p className="text-xl font-bold font-heading truncate">
            {categoryBreakdown[0] ? categoryBreakdown[0].label : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryBreakdown[0] ? formatMoney(categoryBreakdown[0].total, { currency, decimals: 2 }) : 'No data'}
          </p>
        </div>
      </div>

      {/* Category breakdown + expense list */}
      {periodExpenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No expenses logged for this period</p>
          <p className="text-sm mt-1">Log an expense to start tracking where your money goes.</p>
          <Button onClick={() => { setEditingExpense(null); setShowForm(true); }} className="gap-2 mt-4">
            <Plus className="w-4 h-4" /> Log your first expense
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Category breakdown */}
          <div className="bg-card rounded-2xl border border-border p-5 lg:col-span-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Where it went</h3>
            {categoryBreakdown.length > 0 && (
              <div className="relative h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="total"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {categoryBreakdown.map(c => (
                        <Cell key={c.value} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(value, { currency, decimals: 2 })}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold font-heading">{formatMoney(periodTotal, { currency, decimals: 2 })}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {categoryBreakdown.map(c => {
                const pct = periodTotal > 0 ? (c.total / periodTotal) * 100 : 0;
                return (
                  <button
                    key={c.value}
                    onClick={() => setCategoryFilter(categoryFilter === c.value ? 'all' : c.value)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors text-left ${
                      categoryFilter === c.value ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-sm flex-1 truncate">{c.label}</span>
                    <span className="text-sm font-medium">{formatMoney(c.total, { currency, decimals: 2 })}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expense list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {categoryFilter === 'all' ? 'All Expenses' : `${getCategoryMeta(categoryFilter).label} Expenses`}
              </h3>
              {categoryFilter !== 'all' && (
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            {filteredExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No expenses in this category for the selected period.
              </p>
            ) : (
              filteredExpenses.map(expense => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      )}

      <ExpenseForm
        open={showForm}
        onOpenChange={(o) => { if (!o) closeForm(); }}
        onSubmit={handleSubmit}
        expense={editingExpense}
      />
    </PageContainer>
  );
}