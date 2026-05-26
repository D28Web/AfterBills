import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast } from '@/lib/forecast';
import { Wallet, Receipt, PiggyBank, TrendingUp, CalendarDays } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ForecastChart from '@/components/dashboard/ForecastChart';
import UpcomingBills from '@/components/dashboard/UpcomingBills';
import MonthHighlights from '@/components/dashboard/MonthHighlights';
import { format, startOfMonth } from 'date-fns';

const FREQUENCY_OPTIONS = [
  { label: 'Weekly', value: 'weekly', multiplier: 12 / 52 },
  { label: 'Four Weekly', value: 'four_weekly', multiplier: 12 / 13 },
  { label: 'Monthly', value: 'monthly', multiplier: 1 },
  { label: 'Quarterly', value: 'quarterly', multiplier: 3 },
  { label: 'Annually', value: 'annually', multiplier: 12 },
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

  const [viewFrequency, setViewFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM'));

  const income = user?.monthly_income || 0;
  const currency = user?.currency || '£';
  const forecast = generateForecast(bills, income, new Date(startDate + '-01'));
  const currentMonth = forecast[0] || { totalBills: 0, remaining: 0, income: 0 };
  const avgSpare = forecast.reduce((sum, m) => sum + m.remaining, 0) / 12;

  const multiplier = FREQUENCY_OPTIONS.find(f => f.value === viewFrequency)?.multiplier ?? 1;
  const freqLabel = FREQUENCY_OPTIONS.find(f => f.value === viewFrequency)?.label ?? 'Monthly';

  const scale = (val) => (val * multiplier).toFixed(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your financial overview at a glance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Remaining"
          value={`${currency}${scale(currentMonth.remaining)}`}
          subtitle={freqLabel}
          icon={Wallet}
          variant="primary"
        />
        <StatCard
          title="Bills"
          value={`${currency}${scale(currentMonth.totalBills)}`}
          subtitle={`${bills.length} active bills`}
          icon={Receipt}
        />
        <StatCard
          title="Income"
          value={`${currency}${scale(income)}`}
          subtitle={freqLabel}
          icon={PiggyBank}
        />
        <StatCard
          title="Avg Spare"
          value={`${currency}${scale(avgSpare)}`}
          subtitle={freqLabel}
          icon={TrendingUp}
        />
      </div>

      <ForecastChart forecast={forecast} currency={currency} />

      <div className="grid md:grid-cols-2 gap-4">
        <UpcomingBills bills={bills} currency={currency} />
        <MonthHighlights forecast={forecast} currency={currency} />
      </div>
    </div>
  );
}