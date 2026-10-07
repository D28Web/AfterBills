import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPrimaryIncomeContext } from '@/lib/income';
import { getRegularBills } from '@/lib/salarySacrifice';
import { billToMonthlyCost } from '@/lib/forecast';
import { formatMoney, sumMoney, roundMoney } from '@/lib/money';
import {
  getAnnualPaymentOpportunities,
  getTotalPotentialSavings,
  getOpportunityCount,
  calculateAnnualComparison,
  calculateAnnualFundProgress,
  getCurrentPaymentMethod,
  getRollingFundContribution,
  isEligibleForAnnualComparison,
  getMonthlyCost,
} from '@/lib/annualPayment';
import { logActivity } from '@/lib/activityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { format, differenceInCalendarMonths } from 'date-fns';
import { TrendingDown, PiggyBank, RefreshCw, CheckCircle2, AlertTriangle, Info, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import AnnualPaymentScenario from '@/components/bills/AnnualPaymentScenario';
import AnnualCostDialog from '@/components/bills/AnnualCostDialog';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Plus, Receipt } from 'lucide-react';

export default function AnnualPayments() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.SavingsGoal.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });

  const [createFundFor, setCreateFundFor] = useState(null);
  const [fundName, setFundName] = useState('');
  const [annualCostFor, setAnnualCostFor] = useState(null);

  const currency = user?.currency || '£';
  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const monthlySpare = primaryCtx.monthly_income - sumMoney(getRegularBills(bills).map(b => billToMonthlyCost(b)));
  const regularBills = getRegularBills(bills);

  const opportunities = useMemo(
    () => getAnnualPaymentOpportunities(regularBills, goals, monthlySpare),
    [regularBills, goals, monthlySpare]
  );
  const totalSavings = getTotalPotentialSavings(regularBills);
  const opportunityCount = getOpportunityCount(regularBills);

  // Bills already on annual with rolling funds
  const rollingFunds = useMemo(
    () => regularBills.filter(b => getCurrentPaymentMethod(b) === 'annual' && b.annual_fund_goal_id && goals.some(g => g.id === b.annual_fund_goal_id)),
    [regularBills, goals]
  );

  const createGoalMutation = useMutation({
    mutationFn: data => base44.entities.SavingsGoal.create(data),
    onSuccess: (goal, data) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      logActivity('savings_target_changed', 'savings_goal', data.name, `Created annual payment fund "${data.name}"`);
    },
  });

  const linkBillMutation = useMutation({
    mutationFn: ({ billId, goalId }) => base44.entities.Bill.update(billId, { annual_fund_goal_id: goalId, target_payment_method: 'annual' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SavingsGoal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  // Bills that don't have annual payment info yet — candidates for the user to review
  const candidates = useMemo(
    () => regularBills.filter(b => !isEligibleForAnnualComparison(b) && getCurrentPaymentMethod(b) === 'monthly'),
    [regularBills]
  );

  const handleCreateFund = (bill) => {
    const comp = calculateAnnualComparison(bill);
    const name = fundName.trim() || `${bill.name} Annual Fund`;
    const goalData = {
      name,
      type: 'annual_expense',
      target_amount: comp.annualCost,
      current_amount: 0,
      is_annual_fund: true,
      linked_bill_id: bill.id,
      savings_scope: bill.bill_assignment === 'shared' ? 'household' : 'personal',
      household_member_id: bill.household_member_id || null,
    };
    createGoalMutation.mutate(goalData, {
      onSuccess: (goal) => {
        linkBillMutation.mutate({ billId: bill.id, goalId: goal.id });
        toast.success(`Created annual payment fund for ${bill.name}`);
        setCreateFundFor(null);
        setFundName('');
      },
      onError: () => toast.error('Could not create fund'),
    });
  };

  const handleAddContribution = (goal, amount) => {
    updateGoalMutation.mutate({
      id: goal.id,
      data: { current_amount: roundMoney((goal.current_amount || 0) + amount) },
    });
    toast.success(`Added ${formatMoney(amount, { currency, decimals: 2 })} to ${goal.name}`);
  };

  const handleSaveAnnualCost = (data) => {
    if (!annualCostFor) return;
    updateBillMutation.mutate(
      { id: annualCostFor.id, data },
      {
        onSuccess: () => {
          toast.success(`Annual payment info saved for ${annualCostFor.name}`);
          setAnnualCostFor(null);
        },
        onError: () => toast.error('Could not save'),
      }
    );
  };

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Annual Payment Opportunities"
        subtitle="Compare monthly vs annual and build towards the cheaper option"
      />

      {/* Summary banner */}
      {opportunityCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold font-heading text-foreground">
                {formatMoney(totalSavings, { currency, decimals: 0 })}/year potential savings
              </p>
              <p className="text-sm text-muted-foreground">
                {opportunityCount} bill{opportunityCount === 1 ? '' : 's'} could be cheaper if paid annually
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bills to review for annual savings */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Review these bills for annual savings
            </h2>
            <Link to="/bills">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Add bill
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Many providers — insurance, car tax, subscriptions, memberships — offer a discount for paying annually. Add the annual cost to any bill below to see your potential saving and start building towards it.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map(bill => {
              const monthly = getMonthlyCost(bill);
              return (
                <div key={bill.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(monthly, { currency, decimals: 0 })}/mo now
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => setAnnualCostFor(bill)}
                  >
                    Add annual cost
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Opportunities table */}
      {opportunities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Opportunities (ranked by cash saving)</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Bill</th>
                  <th className="px-4 py-2 font-medium text-right">Monthly/yr</th>
                  <th className="px-4 py-2 font-medium text-right">Annual</th>
                  <th className="px-4 py-2 font-medium text-right">Saving</th>
                  <th className="px-4 py-2 font-medium text-right">%</th>
                  <th className="px-4 py-2 font-medium text-right">Renewal</th>
                  <th className="px-4 py-2 font-medium text-right">Req/mo</th>
                  <th className="px-4 py-2 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map(({ bill, comparison, fundProgress, monthsUntil, requiredMonthly, affordability }) => (
                  <tr key={bill.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{bill.name}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(comparison.monthlyYearlyCost, { currency, decimals: 0 })}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatMoney(comparison.annualCost, { currency, decimals: 0 })}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary">{formatMoney(comparison.saving, { currency, decimals: 0 })}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{comparison.percentageSaving}%</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {monthsUntil != null ? (monthsUntil === 0 ? 'Now' : `${monthsUntil}mo`) : '—'}
                    </td>
                    <td className={cn("px-4 py-3 text-right", affordability.affordable ? "text-foreground" : "text-amber-600 dark:text-amber-400")}>
                      {formatMoney(requiredMonthly, { currency, decimals: 0 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {fundProgress ? (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {fundProgress.progress.toFixed(0)}% funded
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setCreateFundFor(bill)}
                        >
                          Build fund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            "Req/mo" is the monthly contribution needed to fund the annual payment by renewal. Amber values may be hard to afford — consider building towards the following year instead.
          </p>
        </div>
      )}

      {/* Existing annual funds (building) */}
      {opportunities.filter(o => o.fundProgress).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Annual Payment Funds (building)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.filter(o => o.fundProgress).map(({ bill, fundProgress, goal }) => (
              <div key={bill.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{bill.name}</h3>
                  {fundProgress.isFullyFunded ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {fundProgress.monthsUntil != null ? `${fundProgress.monthsUntil}mo left` : 'Building'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {formatMoney(fundProgress.currentAmount, { currency, decimals: 2 })} / {formatMoney(fundProgress.annualCost, { currency, decimals: 2 })}
                  </span>
                  <span className="font-medium">{fundProgress.progress.toFixed(0)}%</span>
                </div>
                <Progress value={fundProgress.progress} className="h-2" />
                {!fundProgress.isFullyFunded && (
                  <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg p-2">
                    <span className="text-muted-foreground">Need {formatMoney(fundProgress.requiredMonthly, { currency, decimals: 2 })}/mo</span>
                    <span className={monthlySpare >= fundProgress.requiredMonthly ? 'text-primary font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                      {monthlySpare >= fundProgress.requiredMonthly ? 'On track' : 'Behind'}
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
                        handleAddContribution(goal, val);
                        e.target.value = '';
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rolling funds (already on annual) */}
      {rollingFunds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" /> Rolling Annual Funds
          </h2>
          <p className="text-xs text-muted-foreground">These bills are already paid annually. Continue setting aside the monthly equivalent so the next renewal is already funded.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rollingFunds.map(bill => {
              const goal = goals.find(g => g.id === bill.annual_fund_goal_id);
              if (!goal) return null;
              const rolling = getRollingFundContribution(bill);
              const current = parseFloat(goal.current_amount) || 0;
              const target = parseFloat(goal.target_amount) || 0;
              const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
              return (
                <div key={bill.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{bill.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      On annual
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set aside {formatMoney(rolling, { currency, decimals: 2 })}/month for the next renewal.
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {formatMoney(current, { currency, decimals: 2 })} / {formatMoney(target, { currency, decimals: 2 })}
                    </span>
                    <span className="font-medium">{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <Input
                    type="number"
                    placeholder={`Add ${currency}`}
                    className="h-8 text-xs"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(e.target.value);
                        if (val > 0) {
                          handleAddContribution(goal, val);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No opportunities */}
      {opportunities.length === 0 && rollingFunds.length === 0 && candidates.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <TrendingDown className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-1">No bills to review yet.</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add bills like insurance, car tax, or subscriptions, then come back here to compare monthly vs annual costs.
          </p>
          <Link to="/bills">
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Add a bill
            </Button>
          </Link>
        </div>
      )}

      {/* Scenario modelling */}
      {opportunities.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Scenario Modelling</h2>
          <AnnualPaymentScenario
            bills={regularBills}
            goals={goals}
            monthlySpare={monthlySpare}
            currency={currency}
          />
        </div>
      )}

      {/* Quick annual cost dialog */}
      <AnnualCostDialog
        bill={annualCostFor}
        open={!!annualCostFor}
        onOpenChange={(v) => { if (!v) setAnnualCostFor(null); }}
        onSave={handleSaveAnnualCost}
        currency={currency}
      />

      {/* Create fund dialog */}
      <Dialog open={!!createFundFor} onOpenChange={(v) => { if (!v) { setCreateFundFor(null); setFundName(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Build towards annual payment</DialogTitle>
          </DialogHeader>
          {createFundFor && (
            <div className="space-y-3 py-2">
              {(() => {
                const comp = calculateAnnualComparison(createFundFor);
                const monthsUntil = (() => {
                  if (!createFundFor.renewal_date) return null;
                  return Math.max(0, differenceInCalendarMonths(new Date(createFundFor.renewal_date), new Date()));
                })();
                const required = monthsUntil != null && monthsUntil > 0
                  ? roundMoney(comp.annualCost / monthsUntil)
                  : comp.annualCost;
                return (
                  <>
                    <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Bill</span><span className="font-medium">{createFundFor.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Annual cost</span><span className="font-medium">{formatMoney(comp.annualCost, { currency, decimals: 2 })}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Annual saving</span><span className="font-medium text-primary">{formatMoney(comp.saving, { currency, decimals: 2 })}/yr</span></div>
                      {monthsUntil != null && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Months to renewal</span><span className="font-medium">{monthsUntil}</span></div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-border"><span className="text-muted-foreground">Required / month</span><span className="font-bold text-primary">{formatMoney(required, { currency, decimals: 2 })}</span></div>
                    </div>
                    {monthlySpare > 0 && required > monthlySpare && (
                      <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Funding this before renewal needs {formatMoney(required, { currency, decimals: 0 })}/mo, more than your current spare of {formatMoney(monthlySpare, { currency, decimals: 0 })}/mo. You could consider building towards switching the following year.</span>
                      </div>
                    )}
                    <div>
                      <Label>Fund name (optional)</Label>
                      <Input
                        placeholder={`${createFundFor.name} Annual Fund`}
                        value={fundName}
                        onChange={e => setFundName(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This creates a dedicated savings goal linked to this bill. You can track progress and add contributions over time.
                    </p>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              onClick={() => handleCreateFund(createFundFor)}
              disabled={createGoalMutation.isPending}
            >
              {createGoalMutation.isPending ? 'Creating...' : 'Create fund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}