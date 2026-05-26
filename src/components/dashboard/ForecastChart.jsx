import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

export default function ForecastChart({ forecast, currency = '£' }) {
  const chartData = forecast.map(m => ({
    name: m.shortLabel,
    remaining: m.remaining,
    bills: m.totalBills,
    income: m.income,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
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
      <h3 className="text-sm font-semibold text-foreground mb-4 font-heading">12 Month Forecast</h3>
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