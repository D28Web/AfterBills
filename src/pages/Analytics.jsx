import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast, getCategoryTotals, CATEGORY_COLORS, CATEGORY_LABELS, billToMonthlyCost } from '@/lib/forecast';
import { getPrimaryIncomeContext, getOtherStreams } from '@/lib/income';
import { formatMoney, sumMoney, roundMoney } from '@/lib/money';
import MoneyTooltip from '@/components/charts/MoneyTooltip';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';

export default function Analytics() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: incomeStreams = [] } = useQuery({
    queryKey: ['income-streams'],
    queryFn: () => base44.entities.IncomeStream.list(),
  });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const income = primaryCtx.monthly_income;
  const currency = user?.currency || '£';
  const forecast = generateForecast(bills, income, new Date(), getOtherStreams(incomeStreams), primaryCtx);
  const categoryTotals = getCategoryTotals(bills);
  const avgSpare = roundMoney(sumMoney(forecast.map(m => m.remaining)) / 12);
  const totalMonthlyBills = sumMoney(bills.map(b => billToMonthlyCost(b)));
  const totalAnnualBills = roundMoney(totalMonthlyBills * 12);
  const billToIncomeRatio = income > 0 ? Math.round((totalMonthlyBills / income) * 100) : 0;

  const pieColors = categoryTotals.map(c => CATEGORY_COLORS[c.category]);

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader title="Analytics" subtitle="Understand your spending patterns" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Spare / Month</p>
          <p className="text-2xl font-bold font-heading mt-1">{formatMoney(avgSpare, { currency })}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Annual Bills</p>
          <p className="text-2xl font-bold font-heading mt-1">{formatMoney(totalAnnualBills, { currency })}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Bill-to-Income Ratio</p>
          <p className="text-2xl font-bold font-heading mt-1">{billToIncomeRatio}%</p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <h3 className="text-sm font-semibold font-heading mb-4">Spending by Category</h3>
          {categoryTotals.length > 0 ? (
            <div className="h-64 min-w-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals.map(c => ({ name: CATEGORY_LABELS[c.category], value: c.total }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryTotals.map((c, i) => (
                      <Cell key={i} fill={pieColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<MoneyTooltip currency={currency} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Add bills to see breakdown</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {categoryTotals.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c.category] }} />
                <span className="text-muted-foreground">{CATEGORY_LABELS[c.category]}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 min-w-0">
          <h3 className="text-sm font-semibold font-heading mb-4">Forecast Trend</h3>
          <div className="h-64 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.map(m => ({ name: m.shortLabel, remaining: m.remaining }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v, { currency })} />
                <Tooltip content={<MoneyTooltip currency={currency} />} />
                <Line type="monotone" dataKey="remaining" stroke="hsl(168, 56%, 42%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 min-w-0">
        <h3 className="text-sm font-semibold font-heading mb-4">Monthly Bill Totals</h3>
        <div className="h-64 min-w-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast.map(m => ({ name: m.shortLabel, bills: m.totalBills, remaining: m.remaining }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v, { currency })} />
              <Tooltip content={<MoneyTooltip currency={currency} />} />
              <Bar dataKey="bills" name="Bills" fill="hsl(210, 70%, 55%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="remaining" name="Remaining" fill="hsl(168, 56%, 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </PageContainer>
  );
}