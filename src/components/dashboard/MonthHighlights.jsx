import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/money';

export default function MonthHighlights({ forecast, currency = '£' }) {
  if (!forecast.length) return null;

  const sorted = [...forecast].sort((a, b) => a.totalBills - b.totalBills);
  const lightest = sorted[0];
  const heaviest = sorted[sorted.length - 1];
  const freeBillMonths = forecast.filter(m => m.totalBills === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 font-heading">Month Highlights</h3>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent">
            <TrendingDown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lightest month</p>
            <p className="text-sm font-semibold text-foreground">{lightest.label}</p>
            <p className="text-xs text-primary">{formatMoney(lightest.totalBills, { currency })} in bills</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <TrendingUp className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Heaviest month</p>
            <p className="text-sm font-semibold text-foreground">{heaviest.label}</p>
            <p className="text-xs text-destructive">{formatMoney(heaviest.totalBills, { currency })} in bills</p>
          </div>
        </div>

        {freeBillMonths.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bill-free months</p>
              <p className="text-sm font-semibold text-foreground">
                {freeBillMonths.map(m => m.shortLabel).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Monthly cash remaining</span>
          </div>
          <div className="space-y-1.5">
            {forecast.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-8 text-muted-foreground">{m.shortLabel}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, (m.remaining / m.income) * 100))}%`,
                      backgroundColor: m.remaining > 0 ? 'hsl(168, 56%, 42%)' : 'hsl(0, 72%, 58%)',
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-16 text-right text-foreground">
                  {formatMoney(m.remaining, { currency })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}