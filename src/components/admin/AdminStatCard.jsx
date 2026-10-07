import { motion } from 'framer-motion';

export default function AdminStatCard({ label, value, sub, icon: Icon, accent = 'amber' }) {
  const accents = {
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    slate: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 font-heading">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${accents[accent]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}