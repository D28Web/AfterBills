import { Wallet } from 'lucide-react';
import { formatMoney, roundMoney } from '@/lib/money';
import { motion } from 'framer-motion';

// Prominent card showing the core AfterBills value: what's left after bills.
export default function LeftAfterBillsCard({ monthlySpare, currentMonth, currency, salarySacrificeMonthly = 0, periodLabel = 'Monthly' }) {
  const income = currentMonth?.income || 0;
  const bills = currentMonth?.totalBills || 0;
  const left = monthlySpare != null ? monthlySpare : roundMoney(income - bills);
  const isPositive = left >= 0;
  const periodPhrase = `per ${periodLabel.toLowerCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 border border-border shadow-sm bg-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-accent">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Left After Bills</h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold font-heading tracking-tight ${isPositive ? 'text-foreground' : 'text-destructive'}`}>
          {formatMoney(left, { currency, decimals: 2 })}
        </span>
        <span className="text-sm text-muted-foreground">{periodPhrase}</span>
      </div>
      <div className="mt-4 flex items-center gap-3 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Income</span>
          <span className="font-medium text-foreground">{formatMoney(income, { currency, decimals: 2 })}</span>
        </div>
        <span className="text-muted-foreground">−</span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Bills</span>
          <span className="font-medium text-foreground">{formatMoney(bills, { currency, decimals: 2 })}</span>
        </div>
        <span className="text-muted-foreground">=</span>
        <span className={`font-medium ${isPositive ? 'text-primary' : 'text-destructive'}`}>
          {formatMoney(left, { currency, decimals: 2 })}
        </span>
      </div>
      {salarySacrificeMonthly > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Plus <span className="font-medium text-foreground">{formatMoney(salarySacrificeMonthly, { currency, decimals: 2 })}</span> {periodLabel.toLowerCase()} salary sacrifice (pre-tax, not deducted again)
        </p>
      )}
    </motion.div>
  );
}