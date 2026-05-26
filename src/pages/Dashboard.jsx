import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast, billToMonthlyCost } from '@/lib/forecast';
import { Wallet, Receipt, PiggyBank, TrendingUp } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ForecastChart from '@/components/dashboard/ForecastChart';
import UpcomingBills from '@/components/dashboard/UpcomingBills';
import MonthHighlights from '@/components/dashboard/MonthHighlights';

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const income = user?.monthly_income || 0;
  const currency = user?.currency || '£';
  const forecast = generateForecast(bills, income);
  const currentMonth = forecast[0] || { totalBills: 0, remaining: 0 };
  const totalMonthlyBills = bills.reduce((sum, b) => sum + billToMonthlyCost(b), 0);
  const avgSpare = forecast.reduce((sum, m) => sum + m.remaining, 0) / 12;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your financial overview at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Remaining"
          value={`${currency}${currentMonth.remaining.toFixed(0)}`}
          subtitle="This month"
          icon={Wallet}
          variant="primary"
        />
        <StatCard
          title="Monthly Bills"
          value={`${currency}${totalMonthlyBills.toFixed(0)}`}
          subtitle={`${bills.length} active bills`}
          icon={Receipt}
        />
        <StatCard
          title="Income"
          value={`${currency}${income.toFixed(0)}`}
          subtitle={user?.pay_frequency?.replace('_', ' ') || 'Monthly'}
          icon={PiggyBank}
        />
        <StatCard
          title="Avg Spare"
          value={`${currency}${avgSpare.toFixed(0)}`}
          subtitle="Per month"
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