import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import { format, addMonths, startOfMonth, isSameMonth } from 'date-fns';
import { getPayCycles } from '@/lib/payday';

export default function ForecastChart({ forecast, currency = '£', user }) {
  const chartData = forecast.map(m => ({
    name: m.shortLabel,
    remaining: m.remaining,
    bills: m.totalBills,
    income: m.income,
    date: m.date,
  }));

  // Find which chart months have a payday landing in them (use 16 cycles to ensure 13 visible in 12-month window)
  const payCycleMonths = new Set();
  if (user?.monthly_income || user?.pay_frequency) {
    const cycles = getPayCycles(user, 16);
    cycles.forEach(cycle => {
      chartData.forEach(d => {
        if (isSameMonth(cycle.start, d.date)) {
          payCycleMonths.add(d.name);
        }
      });
    });
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    const isPayday = payCycleMonths.has(label);
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {isPayday && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Payday</span>}
        </div>
        {payload.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name}: {currency}{Math.round(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground font-heading">12 Month Forecast</h3>
        {payCycleMonths.size > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-l-2 border-dashed border-primary/60" />
            <span>Payday</span>
          </div>
        )}
      </div>
      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="remainingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(168, 56%, 42%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(168, 56%, 42%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="billsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 46%)' }} tickFormatter={v => `${currency}${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(0, 72%, 58%)" strokeDasharray="3 3" />
            {[...payCycleMonths].map(monthName => (
              <ReferenceLine
                key={monthName}
                x={monthName}
                stroke="hsl(168, 56%, 42%)"
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                strokeWidth={1.5}
                label={{ value: '💰', position: 'top', fontSize: 10 }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="remaining"
              name="Remaining"
              stroke="hsl(168, 56%, 42%)"
              fill="url(#remainingGrad)"
              strokeWidth={2.5}
            />
            <Area
              type="monotone"
              dataKey="bills"
              name="Bills"
              stroke="hsl(210, 70%, 55%)"
              fill="url(#billsGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}