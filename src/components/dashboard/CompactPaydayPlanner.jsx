import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPayCycles, getDaysUntilPayday } from '@/lib/payday';
import { formatMoney } from '@/lib/money';
import { FREQ_TO_MONTHLY, getEffectivePrimaryCycleIncome } from '@/lib/income';
import PayCycleRow from '@/components/dashboard/PayCycleRow';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

// Compact version of PaydayCycles for the Dashboard: shows only the current
// cycle and the next two, with a link to the full Payday Planner page.
export default function CompactPaydayPlanner({ user, bills, currency = '£' }) {
  const [expanded, setExpanded] = useState(0);
  const monthlyIncome = user?.monthly_income || 0;
  const freq = user?.pay_frequency || 'monthly';
  const baseCycleIncome = monthlyIncome / (FREQ_TO_MONTHLY[freq] || 1);

  const cycles = getPayCycles(user, 3);
  const daysUntilPayday = getDaysUntilPayday(user);
  const housingBills = bills.filter(b => b.category === 'housing');

  if (!monthlyIncome) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 text-center text-xs text-muted-foreground">
        Set your income in Settings to see pay cycle breakdowns.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground font-heading">Pay Cycle Forecast</h3>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {freq.replace('_', '-')} pay · {formatMoney(baseCycleIncome, { currency })} per cycle · {daysUntilPayday ?? 0} days to payday
          </p>
        </div>
        <Link to="/payday-planner">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Full planner
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {cycles.map((cycle, i) => (
          <PayCycleRow
            key={i}
            cycle={cycle}
            index={i}
            cycleIncome={getEffectivePrimaryCycleIncome(user, cycle.start, monthlyIncome)}
            housingBills={housingBills}
            bills={bills}
            currency={currency}
            isOpen={expanded === i}
            onToggle={setExpanded}
          />
        ))}
      </div>
    </div>
  );
}