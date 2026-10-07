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
import IncomeBreakdown from '@/components/dashboard/IncomeBreakdown';
import RenewalAlerts from '@/components/dashboard/RenewalAlerts';
import { getForecastIncomeParams, getStreamMonthlyAmount, FREQ_TO_MONTHLY } from '@/lib/income';
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

  const [viewFrequency, setViewFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM'));

  const { monthlyIncome, incomeStreams: forecastStreams, primaryCtx } = getForecastIncomeParams(incomeStreams, user);
  const currency = user?.currency || '£';
  const forecast = generateForecast(bills, monthlyIncome, new Date(startDate + '-01'), forecastStreams, primaryCtx, sinkingFunds);
  const currentMonth = forecast[0] || { totalBills: 0, remaining: 0, income: 0 };
  const totalMonthlyIncome = roundMoney(sumMoney(incomeStreams.map(s => getStreamMonthlyAmount(s))));
  const avgSpare = roundMoney(sumMoney(forecast.map(m => m.remaining)) / 12);

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

      <IncomeBreakdown incomeStreams={incomeStreams} currency={currency} />

      <RenewalAlerts bills={bills} currency={currency} />

      {sinkingFunds.filter(f => f.status !== 'completed').length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl p-3">
          <PiggyBank className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Forecast includes <span className="font-medium text-foreground">{formatMoney(forecast[0]?.sinkingFunds || 0, { currency, decimals: 2 })}</span>/mo for sinking fund contributions.{' '}
            <Link to="/sinking-funds" className="font-medium underline underline-offset-2">View funds</Link>
          </span>
        </div>
      )}

      <ForecastChart forecast={forecast} currency={currency} user={primaryCtx} />

      <div className="grid md:grid-cols-2 gap-4">
        <UpcomingBills bills={bills} currency={currency} />
        <MonthHighlights forecast={forecast} currency={currency} />
      </div>

      <PaydayCycles user={primaryCtx} bills={bills} currency={currency} />
      <NoBillDuePeriods user={primaryCtx} bills={bills} currency={currency} />
    </PageContainer>
  );
}