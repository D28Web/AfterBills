import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getPrimaryIncomeContext } from '@/lib/income';
import { getPaydayPlannerData } from '@/lib/paydayPlanner';
import { formatMoney } from '@/lib/money';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import PaydayPlannerRow from '@/components/payday-planner/PaydayPlannerRow';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';

export default function PaydayPlanner() {
  const [expanded, setExpanded] = useState(0);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });
  const { data: sinkingFunds = [] } = useQuery({ queryKey: ['sinking-funds'], queryFn: () => base44.entities.SinkingFund.list() });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const currency = user?.currency || '£';
  const plannerData = getPaydayPlannerData(primaryCtx, bills, incomeStreams, sinkingFunds, 6);

  if (!primaryCtx.monthly_income) {
    return (
      <PageContainer maxWidth="wide">
        <PageHeader title="Payday Planner" subtitle="Plan your spending around each payday" />
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Set your income in Settings to see your payday-by-payday plan.</p>
          <Link to="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Go to Settings
          </Link>
        </div>
      </PageContainer>
    );
  }

  const firstCycle = plannerData[0];

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader title="Payday Planner" subtitle="Plan your spending around each payday" />

      {firstCycle && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Next payday</p>
            <p className="text-2xl font-bold font-heading mt-1">{firstCycle.cycleDays}d</p>
            <p className="text-xs text-muted-foreground mt-0.5">{plannerData.length} cycles ahead</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Income / cycle</p>
            <p className="text-2xl font-bold font-heading mt-1">{formatMoney(firstCycle.income.total, { currency, decimals: 2 })}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Committed</p>
            <p className="text-2xl font-bold font-heading mt-1">{formatMoney(firstCycle.totalCommitted, { currency, decimals: 2 })}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Per week</p>
            <p className="text-2xl font-bold font-heading mt-1 text-primary">{formatMoney(firstCycle.perWeekAvailable, { currency, decimals: 2 })}</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {plannerData.map((data) => (
          <PaydayPlannerRow
            key={data.index}
            data={data}
            currency={currency}
            isOpen={expanded === data.index}
            onToggle={setExpanded}
          />
        ))}
      </div>
    </PageContainer>
  );
}