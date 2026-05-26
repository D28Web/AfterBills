import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { generateForecast, getCategoryTotals, CATEGORY_COLORS, CATEGORY_LABELS, billToMonthlyCost } from '@/lib/forecast';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';

export default function Analytics() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const income = user?.monthly_income || 0;
  const currency = user?.currency || '£';
  const forecast = generateForecast(bills, income);
  const categoryTotals = getCategoryTotals(bills);
  const avgSpare = forecast.reduce((sum, m) => sum + m.remaining, 0) / 12;
  const totalAnnualBills = bills.reduce((sum, b) => sum + billToMonthlyCost(b), 0) * 12;

  const pieColors = categoryTotals.map(c => CATEGORY_COLORS[c.category]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <p className="text-xs font-semibold text-foreground">{payload[0].name || payload[0].payload?.name}</p>
        <p className="text-xs text-muted-foreground">{currency}{Math.round(payload[0].value).toLocaleString()}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Understand your spending patterns</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Spare / Month</p>
          <p className="text-2xl font-bold font-heading mt-1">{currency}{avgSpare.toFixed(0)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Annual Bills</p>
          <p className="text-2xl font-bold font-heading mt-1">{currency}{totalAnnualBills.toFixed(0)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Bill-to-Income Ratio</p>
          <p className="text-2xl font-bold font-heading mt-1">
            {income > 0 ? `${Math.round((billToMonthlyCost(bills[0] || { amount: 0, frequency: 'monthly' }) * bills.length / income) * 100 / bills.length)}%` : '0%'}
          </p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold font-heading mb-4">Spending by Category</h3>
          {categoryTotals.length > 0 ? (
            <div className="h-64">
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
                  <Tooltip content={<CustomTooltip />} />
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold font-heading mb-4">Forecast Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.map(m => ({ name: m.shortLabel, remaining: m.remaining }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${currency}${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="remaining" stroke="hsl(168, 56%, 42%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold font-heading mb-4">Monthly Bill Totals</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast.map(m => ({ name: m.shortLabel, bills: m.totalBills, remaining: m.remaining }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${currency}${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bills" name="Bills" fill="hsl(210, 70%, 55%)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="remaining" name="Remaining" fill="hsl(168, 56%, 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}