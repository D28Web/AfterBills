import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, PiggyBank, TrendingUp, Wallet, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatMoney, sumMoney, roundMoney } from '@/lib/money';
import { billToMonthlyCost } from '@/lib/forecast';
import { getPrimaryIncomeContext } from '@/lib/income';
import { getRegularBills } from '@/lib/salarySacrifice';
import {
  getSinkingFundStats,
  getTotalSinkingFundMonthly,
  getTotalSetAside,
  getTotalTarget,
} from '@/lib/sinkingFunds';
import { AnimatePresence } from 'framer-motion';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import SinkingFundCard from '@/components/sinking-funds/SinkingFundCard';
import SinkingFundForm from '@/components/sinking-funds/SinkingFundForm';
import { getMilestones } from '@/lib/insights';
import MilestonesStrip from '@/components/insights/MilestonesStrip';
import { logActivity } from '@/lib/activityLog';

export default function SinkingFunds() {
  const [showForm, setShowForm] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: funds = [] } = useQuery({ queryKey: ['sinking-funds'], queryFn: () => base44.entities.SinkingFund.list() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const currency = user?.currency || '£';
  const monthlySinking = getTotalSinkingFundMonthly(funds);
  const totalSetAside = getTotalSetAside(funds);
  const totalTarget = getTotalTarget(funds);

  const regularBills = getRegularBills(bills);
  const monthlyBills = sumMoney(regularBills.map(b => billToMonthlyCost(b)));
  const monthlySpare = roundMoney(primaryCtx.monthly_income - monthlyBills - monthlySinking);

  const createMutation = useMutation({
    mutationFn: data => base44.entities.SinkingFund.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sinking-funds'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SinkingFund.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sinking-funds'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SinkingFund.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sinking-funds'] }),
  });

  const closeForm = () => { setShowForm(false); setEditingFund(null); };

  const handleSubmit = (data) => {
    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, data });
      closeForm();
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (fund) => { setEditingFund(fund); setShowForm(true); };
  const handleDelete = (fund) => { if (confirm(`Delete "${fund.name}"?`)) deleteMutation.mutate(fund.id); };
  const handleAddFunds = (fund, amount) => {
    const newAmount = roundMoney((parseFloat(fund.current_amount) || 0) + amount);
    const updates = { current_amount: newAmount };
    if (newAmount >= (fund.target_amount || 0)) updates.status = 'completed';
    updateMutation.mutate({ id: fund.id, data: updates });
    logActivity('sinking_fund_contribution', 'sinking_fund', fund.name, `Contributed ${formatMoney(amount, { currency })} to "${fund.name}"`);
  };

  const activeFunds = funds.filter(f => f.status !== 'completed' && getSinkingFundStats(f).remaining > 0);
  const completedFunds = funds.filter(f => f.status === 'completed' || getSinkingFundStats(f).remaining <= 0);

  const linkedBillMap = new Map(bills.map(b => [b.id, b]));
  const sinkingMilestones = getMilestones({ sinkingFunds: funds, goals: [], bills: [] }).filter(m => m.type === 'sinking');

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Sinking Funds"
        subtitle="Gradually reserve money for known future costs"
        actions={
          <Button onClick={() => { setEditingFund(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Fund
          </Button>
        }
      />

      {/* Distinction banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <PiggyBank className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-900">
          Sinking funds help you spread the cost of predictable future expenses. Unlike{' '}
          <Link to="/savings" className="font-medium underline underline-offset-2 inline-flex items-center gap-0.5">
            Savings Goals <Target className="w-3 h-3 inline" />
          </Link>
          , each fund targets a specific due date and calculates what to set aside each month.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Set Aside</span>
          </div>
          <p className="text-xl font-bold font-heading">{formatMoney(totalSetAside, { currency, decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {formatMoney(totalTarget, { currency, decimals: 2 })}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Monthly Reserving</span>
          </div>
          <p className="text-xl font-bold font-heading text-amber-600">{formatMoney(monthlySinking, { currency, decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Across {activeFunds.length} active {activeFunds.length === 1 ? 'fund' : 'funds'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <PiggyBank className="w-4 h-4" />
            <span className="text-xs font-medium">After Bills & Funds</span>
          </div>
          <p className={`text-xl font-bold font-heading ${monthlySpare < 0 ? 'text-red-600' : ''}`}>
            {formatMoney(monthlySpare, { currency, decimals: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Spare after bills & sinking funds</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium">Completed</span>
          </div>
          <p className="text-xl font-bold font-heading text-emerald-600">{completedFunds.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{funds.length} total funds</p>
        </div>
      </div>

      {sinkingMilestones.length > 0 && <MilestonesStrip milestones={sinkingMilestones} />}

      {/* Active funds */}
      {activeFunds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Funds</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {activeFunds.map(fund => (
                <SinkingFundCard
                  key={fund.id}
                  fund={fund}
                  user={primaryCtx}
                  currency={currency}
                  linkedBill={fund.linked_bill_id ? linkedBillMap.get(fund.linked_bill_id) : null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddFunds={handleAddFunds}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Completed funds */}
      {completedFunds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Completed</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {completedFunds.map(fund => (
                <SinkingFundCard
                  key={fund.id}
                  fund={fund}
                  user={primaryCtx}
                  currency={currency}
                  linkedBill={fund.linked_bill_id ? linkedBillMap.get(fund.linked_bill_id) : null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddFunds={handleAddFunds}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty state */}
      {funds.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <PiggyBank className="w-12 h-12 mx-auto mb-3 text-amber-300" />
          <p className="font-medium">No sinking funds yet</p>
          <p className="text-sm mt-1">Create one to start reserving for car insurance, MOT, Christmas and more.</p>
          <Button onClick={() => { setEditingFund(null); setShowForm(true); }} className="gap-2 mt-4">
            <Plus className="w-4 h-4" /> Create your first fund
          </Button>
        </div>
      )}

      {/* Forecast impact note */}
      {monthlySinking > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>
            Your forecast on the{' '}
            <Link to="/" className="font-medium underline underline-offset-2 inline-flex items-center gap-0.5">
              Dashboard <ArrowRight className="w-3 h-3" />
            </Link>{' '}
            already accounts for {formatMoney(monthlySinking, { currency, decimals: 2 })}/mo in sinking fund contributions.
          </span>
        </div>
      )}

      <SinkingFundForm
        open={showForm}
        onOpenChange={(o) => { if (!o) closeForm(); }}
        onSubmit={handleSubmit}
        fund={editingFund}
        bills={bills}
      />
    </PageContainer>
  );
}