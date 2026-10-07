import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { getOpportunityCount, getTotalPotentialSavings } from '@/lib/annualPayment';
import { TrendingDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Compact dashboard summary for annual payment opportunities.
 * Shows total potential savings and a link to the full Annual Payments page.
 * Only renders when there are meaningful savings available.
 */
export default function AnnualPaymentSummary({ bills, goals, currency = '£' }) {
  const totalSavings = getTotalPotentialSavings(bills);
  const count = getOpportunityCount(bills);

  if (count === 0 || totalSavings <= 0) return null;

  return (
    <Link
      to="/annual-payments"
      className="block rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <TrendingDown className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {formatMoney(totalSavings, { currency, decimals: 0 })}/year of potential savings
            </p>
            <p className="text-xs text-muted-foreground">
              Switching {count} bill{count === 1 ? '' : 's'} to annual payment could save you this much.
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}