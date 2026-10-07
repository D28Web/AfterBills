import { CreditCard } from 'lucide-react';
import { formatMoney, roundMoney, sumMoney } from '@/lib/money';
import { billToMonthlyCost } from '@/lib/forecast';
import { Link } from 'react-router-dom';

// Summary of debts (loans + credit cards): remaining balance, monthly payment.
export default function DebtSummary({ bills = [], currency }) {
  const debts = bills.filter(b => ['loans', 'credit_cards'].includes(b.category));
  const totalRemaining = roundMoney(sumMoney(debts.map(d => parseFloat(d.remaining_balance) || 0)));
  const totalMonthly = roundMoney(sumMoney(debts.map(d => billToMonthlyCost(d))));

  return (
    <Link to="/bills" className="block">
      <div className="rounded-2xl p-5 border border-border shadow-sm bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Debt</h3>
          </div>
          <span className="text-xs text-muted-foreground">{debts.length} {debts.length === 1 ? 'debt' : 'debts'}</span>
        </div>
        {debts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No debts tracked. Add a loan or credit card to monitor payoff.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Remaining Balance</p>
              <p className="text-xl font-bold font-heading text-foreground">{formatMoney(totalRemaining, { currency, decimals: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Monthly Payment</p>
              <p className="text-xl font-bold font-heading text-foreground">{formatMoney(totalMonthly, { currency, decimals: 2 })}</p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}