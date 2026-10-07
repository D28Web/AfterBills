import { motion } from 'framer-motion';
import { useState } from 'react';
import { getPayCycles, getDaysUntilPayday } from '@/lib/payday';
import { formatMoney } from '@/lib/money';
import { FREQ_TO_MONTHLY, getEffectivePrimaryCycleIncome } from '@/lib/income';
import PayCycleRow from '@/components/dashboard/PayCycleRow';

export default function PaydayCycles({ user, bills, currency = '£' }) {
  const [expanded, setExpanded] = useState(0);
  const monthlyIncome = user?.monthly_income || 0;
  const freq = user?.pay_frequency || 'monthly';
  const baseCycleIncome = monthlyIncome / (FREQ_TO_MONTHLY[freq] || 1);

  // Show 13 cycles to cover a full year of pay periods
  const cycles = getPayCycles(user, 13);
  const daysUntilPayday = getDaysUntilPayday(user);

  // Find the housing/mortgage bill (if any) to detect "mortgage-free" cycles
  const housingBills = bills.filter(b => b.category === 'housing');

  if (!monthlyIncome) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 text-center text-xs text-muted-foreground">
        Set your income in Settings to see pay cycle breakdowns.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground font-heading">Pay Cycle Forecast</h3>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {freq.replace('_', '-')} pay · {formatMoney(baseCycleIncome, { currency })} per cycle · {daysUntilPayday ?? 0} days to payday
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{cycles.length} cycles ahead</span>
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
    </motion.div>
  );
}