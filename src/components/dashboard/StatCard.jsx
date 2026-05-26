import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }) {
  const variants = {
    default: 'bg-card',
    primary: 'bg-primary text-primary-foreground',
    accent: 'bg-accent',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-5 border border-border shadow-sm",
        variants[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-xs font-medium uppercase tracking-wider",
            variant === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            "text-2xl md:text-3xl font-bold font-heading tracking-tight",
            variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-xs",
              variant === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-2.5 rounded-xl",
            variant === 'primary' ? 'bg-primary-foreground/10' : 'bg-muted'
          )}>
            <Icon className={cn(
              "w-5 h-5",
              variant === 'primary' ? 'text-primary-foreground' : 'text-primary'
            )} />
          </div>
        )}
      </div>
    </motion.div>
  );
}