import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wallet, Scale, SlidersHorizontal, GitCompare, Tags, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoney } from '@/lib/money';
import { calculateBudget, generateGuidance, compareAllRules, BUDGET_RULES, RULE_KEYS, DEFAULT_RULE } from '@/lib/budgeting';
import { useDisplayPeriod, DISPLAY_PERIOD_LABELS } from '@/lib/displayPeriod';
import { scaleToPeriod } from '@/lib/budgeting';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import BudgetBucketCard from '@/components/budgeting/BudgetBucketCard';
import GuidanceList from '@/components/budgeting/GuidanceList';
import ScenarioModeller from '@/components/budgeting/ScenarioModeller';
import RuleComparison from '@/components/budgeting/RuleComparison';
import ClassificationList from '@/components/budgeting/ClassificationList';
import DisclaimerNotice from '@/components/disclaimers/DisclaimerNotice';

export default function Budgeting() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  const { data: sinkingFunds = [] } = useQuery({ queryKey: ['sinking-funds'], queryFn: () => base44.entities.SinkingFund.list() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.SavingsGoal.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });
  const { data: overrides = [] } = useQuery({ queryKey: ['budget-overrides'], queryFn: () => base44.entities.BudgetOverride.list() });

  const [displayPeriod] = useDisplayPeriod(user);
  const currency = user?.currency || '£';
  const currentRule = user?.budgeting_rule || DEFAULT_RULE;

  const budget = useMemo(() => {
    if (!user) return null;
    return calculateBudget({ bills, expenses, sinkingFunds, goals, incomeStreams, user, overrides });
  }, [bills, expenses, sinkingFunds, goals, incomeStreams, user, overrides]);

  const guidance = useMemo(() => budget ? generateGuidance(budget, currency) : [], [budget, currency]);
  const comparison = useMemo(() => budget ? compareAllRules(budget) : [], [budget]);

  const handleRuleChange = async (ruleKey) => {
    await base44.auth.updateMe({ budgeting_rule: ruleKey });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  if (!budget) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6">
        <PageHeader title="Budgeting Rules" subtitle="See how your spending compares to your chosen rule" />
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  const periodLabel = DISPLAY_PERIOD_LABELS[displayPeriod] || 'Monthly';
  const scale = (monthly) => scaleToPeriod(monthly, displayPeriod);

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Budgeting Rules"
        subtitle="Guidance based on your actual finances — not financial advice or guaranteed targets"
        actions={
          <div className="flex items-center gap-2">
            <Select value={currentRule} onValueChange={handleRuleChange}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_KEYS.map(key => (
                  <SelectItem key={key} value={key}>{BUDGET_RULES[key].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Rule explanation */}
      <div className="bg-muted/50 rounded-2xl border border-border p-4 flex gap-3">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{budget.rule.label} — {budget.rule.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{budget.rule.longDescription}</p>
        </div>
      </div>

      {/* Income summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Available Income</span>
          </div>
          <p className="text-xl font-bold font-heading">{formatMoney(scale(budget.monthlyIncome), { currency, decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{periodLabel} take-home</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Scale className="w-4 h-4" />
            <span className="text-xs font-medium">Allocated</span>
          </div>
          <p className="text-xl font-bold font-heading">{formatMoney(scale(budget.totalAllocated), { currency, decimals: 2 })}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{periodLabel} across all categories</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Surplus</span>
          </div>
          <p className={`text-xl font-bold font-heading ${budget.surplus < 0 ? 'text-red-600' : ''}`}>
            {formatMoney(scale(budget.surplus), { currency, decimals: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{periodLabel} after allocations</p>
        </div>
        {budget.salarySacrificeMonthly > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Info className="w-4 h-4" />
              <span className="text-xs font-medium">Salary Sacrifice</span>
            </div>
            <p className="text-xl font-bold font-heading">{formatMoney(scale(budget.salarySacrificeMonthly), { currency, decimals: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pre-tax, not in budget</p>
          </div>
        )}
      </div>

      {/* Bucket cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Position</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {budget.bucketBreakdown.map(bucket => (
            <BudgetBucketCard
              key={bucket.key}
              bucket={{ ...bucket, amount: scale(bucket.amount), targetAmount: scale(bucket.targetAmount), diff: scale(bucket.diff) }}
              currency={currency}
              period={displayPeriod}
            />
          ))}
        </div>
      </div>

      {/* Guidance */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Guidance</h3>
          <DisclaimerNotice label="Not financial advice" />
        </div>
        <GuidanceList guidance={guidance} />
      </div>

      {/* Tabs: Scenario, Comparison, Classification */}
      <Tabs defaultValue="scenario">
        <TabsList className="w-fit">
          <TabsTrigger value="scenario" className="gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Scenario
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5">
            <GitCompare className="w-3.5 h-3.5" /> Compare Rules
          </TabsTrigger>
          <TabsTrigger value="classification" className="gap-1.5">
            <Tags className="w-3.5 h-3.5" /> Classification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scenario" className="mt-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <ScenarioModeller budget={budget} currency={currency} />
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <RuleComparison comparison={comparison} currentRule={currentRule} currency={currency} />
          </div>
        </TabsContent>

        <TabsContent value="classification" className="mt-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <ClassificationList
              bills={bills}
              expenses={expenses}
              sinkingFunds={sinkingFunds}
              goals={goals}
              overrides={overrides}
              overrideMap={budget.overrideMap}
              currency={currency}
            />
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}