import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast } from '@/lib/forecast';
import { roundMoney } from '@/lib/money';
import { CalendarDays, SlidersHorizontal } from 'lucide-react';
import { getPaydayPlannerData } from '@/lib/paydayPlanner';
import { getForecastIncomeParams } from '@/lib/income';
import { getPeriodComparisons, getMilestones, getInsights } from '@/lib/insights';
import { format, startOfMonth } from 'date-fns';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import DashboardSection from '@/components/dashboard/DashboardSection';
import DashboardCustomize from '@/components/dashboard/DashboardCustomize';
import { resolveLayout, getVisibleSections, MODE_PRESETS, MODE_LABELS, DASHBOARD_MODES, DEFAULT_MODE } from '@/lib/dashboardSections';
import { useDisplayPeriod, DISPLAY_PERIOD_OPTIONS, DISPLAY_PERIOD_LABELS, getPeriodFactor } from '@/lib/displayPeriod';
import { getRegularBills, getMonthlySalarySacrifice } from '@/lib/salarySacrifice';
import { calculateBudget } from '@/lib/budgeting';

const FREQUENCY_OPTIONS = DISPLAY_PERIOD_OPTIONS;

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: incomeStreams = [] } = useQuery({
    queryKey: ['income-streams'],
    queryFn: () => base44.entities.IncomeStream.list(),
  });

  const { data: sinkingFunds = [] } = useQuery({
    queryKey: ['sinking-funds'],
    queryFn: () => base44.entities.SinkingFund.list(),
  });

  const { data: tripExpenses = [] } = useQuery({
    queryKey: ['trip-expenses'],
    queryFn: () => base44.entities.TripExpense.list(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.SavingsGoal.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['budget-overrides'],
    queryFn: () => base44.entities.BudgetOverride.list(),
  });

  const queryClient = useQueryClient();
  const [viewFrequency, setViewFrequency] = useDisplayPeriod(user);
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM'));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const currentMode = user?.dashboard_mode || DEFAULT_MODE;
  const layout = resolveLayout(user?.dashboard_layout, currentMode);
  const visibleSections = getVisibleSections(layout);

  const { monthlyIncome, incomeStreams: forecastStreams, primaryCtx } = getForecastIncomeParams(incomeStreams, user);
  const currency = user?.currency || '£';
  const buffer = parseFloat(user?.preferred_buffer) || 0;
  const regularBills = getRegularBills(bills);
  const salarySacrificeMonthly = getMonthlySalarySacrifice(bills);
  const plannerData = getPaydayPlannerData(primaryCtx, regularBills, incomeStreams, sinkingFunds, tripExpenses, 6);
  const safeToSpendCycle = plannerData[0];
  const forecast = generateForecast(regularBills, monthlyIncome, new Date(startDate + '-01'), forecastStreams, primaryCtx, sinkingFunds);
  const currentMonth = forecast[0] || { totalBills: 0, remaining: 0, income: 0 };
  const monthlySpare = roundMoney(currentMonth.income - currentMonth.totalBills);
  const comparisons = getPeriodComparisons({ bills: regularBills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, currency });
  const emergencyGoal = goals.find(g => g.is_emergency_fund);
  const milestones = getMilestones({ goals, sinkingFunds, bills: regularBills, emergencyGoal, primaryCtx, monthlySpare, currency });
  const insights = getInsights({ plannerData, forecast, bills: regularBills, goals, monthlySpare, currency });
  const budget = user ? calculateBudget({ bills, expenses, sinkingFunds, goals, incomeStreams, user, overrides }) : null;

  // Scale the display figures to the selected period. Calculation-only values
  // (emergency fund, milestones, insights) keep the original monthly amounts.
  const periodFactor = getPeriodFactor(viewFrequency);
  const periodLabel = DISPLAY_PERIOD_LABELS[viewFrequency] || 'Monthly';
  const displayMonth = {
    ...currentMonth,
    income: roundMoney(currentMonth.income * periodFactor),
    totalBills: roundMoney(currentMonth.totalBills * periodFactor),
    remaining: roundMoney(currentMonth.remaining * periodFactor),
  };
  const displaySpare = roundMoney(monthlySpare * periodFactor);
  const displaySalarySacrifice = roundMoney(salarySacrificeMonthly * periodFactor);

  const dashData = {
    monthlySpare: displaySpare, currentMonth: displayMonth, currency, incomeStreams,
    safeToSpendCycle, buffer, bills: regularBills, sinkingFunds, goals,
    forecast, plannerData, primaryCtx, emergencyGoal,
    comparisons, insights, milestones, salarySacrificeMonthly: displaySalarySacrifice,
    budget, periodLabel,
  };

  const handleSaveLayout = async (newLayout, newMode) => {
    try {
      await base44.auth.updateMe({ dashboard_layout: newLayout, dashboard_mode: newMode });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch {
      // silently fail — layout still works locally until refresh
    }
  };

  const handleModeChange = (mode) => {
    const preset = MODE_PRESETS[mode];
    if (!preset) return;
    handleSaveLayout(preset, mode);
  };

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your financial overview at a glance"
        actions={
          <>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <label className="text-xs text-muted-foreground font-medium">From</label>
              <input
                type="month"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1 flex-wrap">
              {FREQUENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setViewFrequency(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    viewFrequency === opt.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              {DASHBOARD_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    currentMode === mode
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCustomizeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customize</span>
            </button>
          </>
        }
      />

      <DashboardCustomize
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        layout={layout}
        currentMode={currentMode}
        onSave={handleSaveLayout}
      />
      {visibleSections.map(key => (
        <DashboardSection key={key} sectionKey={key} data={dashData} />
      ))}
    </PageContainer>
  );
}