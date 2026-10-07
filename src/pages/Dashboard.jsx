import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const [viewFrequency, setViewFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM'));

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

      <ThingsToKnow
        bills={bills}
        incomeStreams={incomeStreams}
        sinkingFunds={sinkingFunds}
        goals={goals}
        forecast={forecast}
        plannerData={plannerData}
        buffer={buffer}
        monthlySpare={monthlySpare}
        currency={currency}
      />

      {safeToSpendCycle && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SafeToSpendCard data={safeToSpendCycle} currency={currency} />
          </div>
          <BufferIndicator amountLeft={safeToSpendCycle.amountLeft} buffer={buffer} currency={currency} />
        </div>
      )}

      <IncomeBreakdown incomeStreams={incomeStreams} currency={currency} />

      {sinkingFunds.filter(f => f.status !== 'completed').length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl p-3">
          <PiggyBank className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Forecast includes <span className="font-medium text-foreground">{formatMoney(forecast[0]?.sinkingFunds || 0, { currency, decimals: 2 })}</span>/mo for sinking fund contributions.{' '}
            <Link to="/sinking-funds" className="font-medium underline underline-offset-2">View funds</Link>
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <PeriodComparisonCard comparisons={comparisons} currency={currency} />
        <InsightsList insights={insights} />
      </div>

      <ForecastChart forecast={forecast} currency={currency} user={primaryCtx} />

      <UpcomingCommitments bills={bills} sinkingFunds={sinkingFunds} currency={currency} />

      <div className="grid md:grid-cols-2 gap-4">
        <UpcomingBills bills={bills} currency={currency} />
        <MonthHighlights forecast={forecast} currency={currency} />
      </div>

      <PaydayCycles user={primaryCtx} bills={bills} currency={currency} />
      <NoBillDuePeriods user={primaryCtx} bills={bills} currency={currency} />
    </PageContainer>
  );
}