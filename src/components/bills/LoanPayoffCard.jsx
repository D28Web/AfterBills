import { Pencil, Trash2, Target, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { addDays, addMonths, addYears, format } from 'date-fns';
import { CATEGORY_COLORS, CATEGORY_LABELS, getBillShare } from '@/lib/forecast';
import { formatMoney, roundMoney } from '@/lib/money';

function addPeriod(date, freq) {
  switch (freq) {
    case 'weekly': return addDays(date, 7);
    case 'fortnightly': return addDays(date, 14);
    case 'four_weekly': return addDays(date, 28);
    case 'quarterly': return addMonths(date, 3);
    case 'annually': return addYears(date, 1);
    case 'monthly':
    default: return addMonths(date, 1);
  }
}

function monthDiff(a, b) {
  return (a.getFullYear() * 12 + a.getMonth()) - (b.getFullYear() * 12 + b.getMonth());
}

export default function LoanPayoffCard({ bill, currency = '£', onEdit, onDelete }) {
  const payment = getBillShare(bill);
  const balance = bill.remaining_balance || 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasData = payment > 0 && balance > 0;
  const periodsToPayoff = hasData ? Math.ceil(balance / payment) : 0;
  const cap = Math.min(periodsToPayoff, 600);

  const points = [{ date: today.getTime(), label: format(today, 'MMM yy'), balance: roundMoney(balance) }];
  for (let i = 1; i <= cap; i++) {
    const nd = addPeriod(new Date(points[i - 1].date), bill.frequency);
    const nb = Math.max(0, balance - i * payment);
    points.push({ date: nd.getTime(), label: format(nd, 'MMM yy'), balance: roundMoney(nb) });
  }
  const projectedDate = hasData ? new Date(points[points.length - 1].date) : null;
  const targetDate = bill.target_end_date ? new Date(bill.target_end_date) : null;

  let status = null;
  if (hasData && targetDate) {
    const diff = monthDiff(targetDate, projectedDate);
    if (diff >= 0) {
      status = { label: diff > 0 ? `On track · ${diff} mo ahead` : 'On track', tone: 'good' };
    } else {
      status = { label: `${Math.abs(diff)} mo behind target`, tone: 'bad' };
    }
  }

  const accent = CATEGORY_COLORS[bill.category] || CATEGORY_COLORS.other;
  const paymentsLeft = hasData ? periodsToPayoff : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-3 h-12 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{bill.name}</h4>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[bill.category]}</p>
            {status && (
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.tone === 'good' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {status.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(bill)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(bill)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-lg font-bold font-heading text-foreground">{formatMoney(balance, { currency, decimals: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Payment / {bill.frequency}</p>
          <p className="text-lg font-bold font-heading text-foreground">{formatMoney(payment, { currency, decimals: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Projected payoff</p>
          <p className="text-sm font-semibold text-foreground">{projectedDate ? format(projectedDate, 'd MMM yyyy') : '—'}</p>
          {hasData && <p className="text-xs text-muted-foreground">{paymentsLeft} payments left</p>}
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Target date</p>
          <p className="text-sm font-semibold text-foreground">{targetDate ? format(targetDate, 'd MMM yyyy') : 'Not set'}</p>
          {targetDate && <p className="text-xs text-muted-foreground">{Math.max(0, monthDiff(targetDate, today))} mo from now</p>}
        </div>
      </div>

      <div className="mt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={points} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${bill.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(t) => format(new Date(t), 'MMM yy')}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => `${currency}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip
                labelFormatter={(l) => format(new Date(l), 'd MMM yyyy')}
                formatter={(v) => [formatMoney(v, { currency, decimals: 2 }), 'Balance']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
              />
              {targetDate && (
                <ReferenceLine
                  x={targetDate.getTime()}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 4"
                  label={{ value: 'Target', position: 'top', fontSize: 10, fill: 'hsl(var(--destructive))' }}
                />
              )}
              <Area type="monotone" dataKey="balance" stroke={accent} strokeWidth={2} fill={`url(#grad-${bill.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[150px] flex items-center justify-center text-center px-4">
            <p className="text-xs text-muted-foreground">Add a remaining balance to project your payoff timeline.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}