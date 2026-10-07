import { cn } from '@/lib/utils';

const ROLE_STYLES = {
  owner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  admin: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  user: 'bg-muted text-muted-foreground border-border',
};

export default function RoleBadge({ role }) {
  const r = role || 'user';
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      ROLE_STYLES[r] || ROLE_STYLES.user
    )}>
      {r}
    </span>
  );
}