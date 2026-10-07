import LeftAfterBillsCard from './LeftAfterBillsCard';
import SafeToSpendCard from '@/components/payday-planner/SafeToSpendCard';
import BufferIndicator from '@/components/payday-planner/BufferIndicator';

// Main hero: Left After Bills (primary figure) + Safe to Spend + buffer.
// Combines the two most important numbers above the fold in a 5-col grid
// (3 for Left After Bills, 2 for Safe to Spend) so both are immediately
// visible on a laptop display.
export default function HeroSection({ monthlySpare, currentMonth, currency, salarySacrificeMonthly, safeToSpendCycle, buffer, periodLabel }) {
  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3">
        <LeftAfterBillsCard
          monthlySpare={monthlySpare}
          currentMonth={currentMonth}
          currency={currency}
          salarySacrificeMonthly={salarySacrificeMonthly}
          periodLabel={periodLabel}
        />
      </div>
      <div className="lg:col-span-2 space-y-4">
        {safeToSpendCycle && (
          <SafeToSpendCard data={safeToSpendCycle} currency={currency} />
        )}
        {safeToSpendCycle && buffer > 0 && (
          <BufferIndicator
            amountLeft={safeToSpendCycle.amountLeft}
            buffer={buffer}
            currency={currency}
          />
        )}
      </div>
    </div>
  );
}