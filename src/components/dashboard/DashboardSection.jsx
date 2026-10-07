import ThingsToKnow from '@/components/alerts/ThingsToKnow';
import UpcomingCommitments from './UpcomingCommitments';
import ForecastChart from './ForecastChart';
import IncomeBreakdown from './IncomeBreakdown';
import NoBillDuePeriods from './NoBillDuePeriods';
import PeriodComparisonCard from '@/components/insights/PeriodComparisonCard';
import InsightsList from '@/components/insights/InsightsList';
import DebtSummary from './DebtSummary';
import HeroSection from './HeroSection';
import CompactPaydayPlanner from './CompactPaydayPlanner';
import GoalsFundsSummary from './GoalsFundsSummary';

// Maps a section key to its rendered content. Each section is a self-contained
// block that works in the vertical stack regardless of position, preserving
// responsive behaviour.
export default function DashboardSection({ sectionKey, data }) {
  switch (sectionKey) {
    case 'hero':
      return (
        <HeroSection
          monthlySpare={data.monthlySpare}
          currentMonth={data.currentMonth}
          currency={data.currency}
          salarySacrificeMonthly={data.salarySacrificeMonthly}
          safeToSpendCycle={data.safeToSpendCycle}
          buffer={data.buffer}
        />
      );
    case 'payday_planner':
      return <CompactPaydayPlanner user={data.primaryCtx} bills={data.bills} currency={data.currency} />;
    case 'upcoming_commitments':
      return <UpcomingCommitments bills={data.bills} sinkingFunds={data.sinkingFunds} currency={data.currency} />;
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
          insights={data.insights}
          milestones={data.milestones}
          maxItems={3}
          viewAllUrl="/reminders"
        />
      );
    case 'goals_funds':
      return (
        <GoalsFundsSummary
          goals={data.goals}
          emergencyGoal={data.emergencyGoal}
          sinkingFunds={data.sinkingFunds}
          bills={data.bills}
          monthlySpare={data.monthlySpare}
          primaryCtx={data.primaryCtx}
          currency={data.currency}
        />
      );
    case 'debt':
      return <DebtSummary bills={data.bills} currency={data.currency} />;
    case 'forecast':
      return <ForecastChart forecast={data.forecast} currency={data.currency} user={data.primaryCtx} />;
    case 'income_breakdown':
      return <IncomeBreakdown incomeStreams={data.incomeStreams} currency={data.currency} />;
    case 'period_comparison':
      return <PeriodComparisonCard comparisons={data.comparisons} currency={data.currency} />;
    case 'pay_periods':
      return <NoBillDuePeriods user={data.primaryCtx} bills={data.bills} currency={data.currency} />;
    case 'full_insights':
      return <InsightsList insights={data.insights} />;
    default:
      return null;
  }
}