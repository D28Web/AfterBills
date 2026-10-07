import { motion } from 'framer-motion';

export default function AdminStatCard({ label, value, sub, icon: Icon, accent = 'amber' }) {
  const accents = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 font-heading">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
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