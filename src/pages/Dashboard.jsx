import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { generateForecast } from '@/lib/forecast';
import { formatMoney, sumMoney, roundMoney } from '@/lib/money';
import { Wallet, Receipt, PiggyBank, TrendingUp, CalendarDays } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ForecastChart from '@/components/dashboard/ForecastChart';
import UpcomingBills from '@/components/dashboard/UpcomingBills';
import MonthHighlights from '@/components/dashboard/MonthHighlights';
import PaydayCycles from '@/components/dashboard/PaydayCycles';
import NoBillDuePeriods from '@/components/dashboard/NoBillDuePeriods';
import UpcomingCommitments from '@/components/dashboard/UpcomingCommitments';
import IncomeBreakdown from '@/components/dashboard/IncomeBreakdown';
import ThingsToKnow from '@/components/alerts/ThingsToKnow';
import SafeToSpendCard from '@/components/payday-planner/SafeToSpendCard';
import BufferIndicator from '@/components/payday-planner/BufferIndicator';
import { getPaydayPlannerData } from '@/lib/paydayPlanner';
import { getForecastIncomeParams, getStreamMonthlyAmount, FREQ_TO_MONTHLY } from '@/lib/income';
import { getPeriodComparisons, getMilestones, getInsights } from '@/lib/insights';
import PeriodComparisonCard from '@/components/insights/PeriodComparisonCard';
import MilestonesStrip from '@/components/insights/MilestonesStrip';
import InsightsList from '@/components/insights/InsightsList';
import { format, startOfMonth } from 'date-fns';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import DashboardSection from '@/components/dashboard/DashboardSection';
import DashboardCustomize from '@/components/dashboard/DashboardCustomize';
import { resolveLayout, getVisibleSections } from '@/lib/dashboardSections';
import { SlidersHorizontal } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { label: 'Weekly', value: 'weekly' },
  { label: '4-Weekly', value: 'four_weekly' },
  { label: 'Monthly', value: 'monthly' },
];

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

  const queryClient = useQueryClient();
  const [viewFrequency, setViewFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM'));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const layout = resolveLayout(user?.dashboard_layout);
  const visibleSections = getVisibleSections(layout);

  const { monthlyIncome, incomeStreams: forecastStreams, primaryCtx } = getForecastIncomeParams(incomeStreams, user);
  const currency = user?.currency || '£';
  const buffer = parseFloat(user?.preferred_buffer) || 0;
  const plannerData = getPaydayPlannerData(primaryCtx, bills, incomeStreams, sinkingFunds, tripExpenses, 6);
  const safeToSpendCycle = plannerData[0];
  const forecast = generateForecast(bills, monthlyIncome, new Date(startDate + '-01'), forecastStreams, primaryCtx, sinkingFunds);
  const currentMonth = forecast[0] || { totalBills: 0, remaining: 0, income: 0 };
  const totalMonthlyIncome = roundMoney(sumMoney(incomeStreams.map(s => getStreamMonthlyAmount(s))));
  const avgSpare = roundMoney(sumMoney(forecast.map(m => m.remaining)) / 12);

  const monthlySpare = roundMoney(currentMonth.income - currentMonth.totalBills);
  const comparisons = getPeriodComparisons({ bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, currency });
  const emergencyGoal = goals.find(g => g.is_emergency_fund);
  const milestones = getMilestones({ goals, sinkingFunds, bills, emergencyGoal, primaryCtx, monthlySpare, currency });
  const insights = getInsights({ plannerData, forecast, bills, goals, monthlySpare, currency });

  const multiplier = 1 / (FREQ_TO_MONTHLY[viewFrequency] || 1);
  const freqLabel = FREQUENCY_OPTIONS.find(f => f.value === viewFrequency)?.label ?? 'Monthly';

  const scale = (val) => formatMoney(val * multiplier, { currency });

  const dashData = {
    monthlySpare, currentMonth, currency, incomeStreams,
    safeToSpendCycle, buffer, bills, sinkingFunds, goals,
    forecast, plannerData, primaryCtx, emergencyGoal,
    comparisons, insights,
  };

  const handleSaveLayout = async (newLayout) => {
    try {
      await base44.auth.updateMe({ dashboard_layout: newLayout });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      // silently fail — layout still works locally until refresh
    }
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Remaining"
          value={scale(currentMonth.income - currentMonth.totalBills)}
          subtitle={freqLabel}
          icon={Wallet}
          variant="primary"
        />
        <StatCard
          title="Bills"
          value={scale(currentMonth.totalBills)}
          subtitle={`${bills.length} active bills`}
          icon={Receipt}
        />
        <StatCard
          title="Income"
          value={scale(totalMonthlyIncome)}
          subtitle={`${incomeStreams.length} ${incomeStreams.length === 1 ? 'source' : 'sources'}`}
          icon={PiggyBank}
        />
        <StatCard
          title="Avg Spare"
          value={scale(avgSpare)}
          subtitle={freqLabel}
          icon={TrendingUp}
        />
      </div>

      {milestones.filter(m => m.type !== 'debt').length > 0 && (
        <MilestonesStrip milestones={milestones.filter(m => m.type !== 'debt')} />
      )}

      <DashboardCustomize
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        layout={layout}
        onSave={handleSaveLayout}
      />
      {visibleSections.map(key => (
        <DashboardSection key={key} sectionKey={key} data={dashData} />
      ))}
    </PageContainer>
  );
}