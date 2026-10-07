import { Link } from 'react-router-dom';
import { PiggyBank } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import LeftAfterBillsCard from './LeftAfterBillsCard';
import SafeToSpendCard from '@/components/payday-planner/SafeToSpendCard';
import BufferIndicator from '@/components/payday-planner/BufferIndicator';
import ThingsToKnow from '@/components/alerts/ThingsToKnow';
import UpcomingCommitments from './UpcomingCommitments';
import UpcomingBills from './UpcomingBills';
import MonthHighlights from './MonthHighlights';
import PaydayCycles from './PaydayCycles';
import NoBillDuePeriods from './NoBillDuePeriods';
import ForecastChart from './ForecastChart';
import IncomeBreakdown from './IncomeBreakdown';
import PeriodComparisonCard from '@/components/insights/PeriodComparisonCard';
import InsightsList from '@/components/insights/InsightsList';
import SavingsSummary from './SavingsSummary';
import EmergencyFundSummary from './EmergencyFundSummary';
import SinkingFundsSummary from './SinkingFundsSummary';
import DebtSummary from './DebtSummary';

// Maps a section key to its rendered content. Each section is a self-contained
// block that works in the vertical stack regardless of position, preserving
// responsive behaviour.
export default function DashboardSection({ sectionKey, data }) {
  switch (sectionKey) {
    case 'left_after_bills':
      return (
        <div className="space-y-4">
          <LeftAfterBillsCard monthlySpare={data.monthlySpare} currentMonth={data.currentMonth} currency={data.currency} />
          <IncomeBreakdown incomeStreams={data.incomeStreams} currency={data.currency} />
        </div>
      );
    case 'safe_to_spend':
      return data.safeToSpendCycle ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SafeToSpendCard data={data.safeToSpendCycle} currency={data.currency} />
          </div>
          <BufferIndicator amountLeft={data.safeToSpendCycle.amountLeft} buffer={data.buffer} currency={data.currency} />
        </div>
      ) : null;
    case 'things_to_know':
      return (
        <ThingsToKnow
          bills={data.bills}
          incomeStreams={data.incomeStreams}
          sinkingFunds={data.sinkingFunds}
          goals={data.goals}
          forecast={data.forecast}
          plannerData={data.plannerData}
          buffer={data.buffer}
          monthlySpare={data.monthlySpare}
          currency={data.currency}
        />
      );
    case 'upcoming_commitments':
      return (
        <div className="space-y-4">
          <UpcomingCommitments bills={data.bills} sinkingFunds={data.sinkingFunds} currency={data.currency} />
          <div className="grid md:grid-cols-2 gap-4">
            <UpcomingBills bills={data.bills} currency={data.currency} />
            <MonthHighlights forecast={data.forecast} currency={data.currency} />
          </div>
        </div>
      );
    case 'payday_planner':
      return (
        <div className="space-y-4">
          <PaydayCycles user={data.primaryCtx} bills={data.bills} currency={data.currency} />
          <NoBillDuePeriods user={data.primaryCtx} bills={data.bills} currency={data.currency} />
        </div>
      );
    case 'savings':
      return <SavingsSummary goals={data.goals} currency={data.currency} />;
    case 'emergency_fund':
      return <EmergencyFundSummary goal={data.emergencyGoal} bills={data.bills} monthlySpare={data.monthlySpare} primaryCtx={data.primaryCtx} currency={data.currency} />;
    case 'sinking_funds':
      return (
        <div className="space-y-4">
          <SinkingFundsSummary sinkingFunds={data.sinkingFunds} currency={data.currency} />
          {data.sinkingFunds.filter(f => f.status !== 'completed').length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl p-3">
              <PiggyBank className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Forecast includes <span className="font-medium text-foreground">{formatMoney(data.forecast[0]?.sinkingFunds || 0, { currency: data.currency, decimals: 2 })}</span>/mo for sinking fund contributions.{' '}
                <Link to="/sinking-funds" className="font-medium underline underline-offset-2">View funds</Link>
              </span>
            </div>
          )}
        </div>
      );
    case 'debt':
      return <DebtSummary bills={data.bills} currency={data.currency} />;
    case 'forecast':
      return (
        <div className="space-y-4">
          <ForecastChart forecast={data.forecast} currency={data.currency} user={data.primaryCtx} />
          <div className="grid lg:grid-cols-2 gap-4">
            <PeriodComparisonCard comparisons={data.comparisons} currency={data.currency} />
            <InsightsList insights={data.insights} />
          </div>
        </div>
      );
    default:
      return null;
  }
}