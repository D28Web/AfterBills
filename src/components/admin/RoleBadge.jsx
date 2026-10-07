import { cn } from '@/lib/utils';

const ROLE_STYLES = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-sky-100 text-sky-800 border-sky-200',
  user: 'bg-slate-100 text-slate-600 border-slate-200',
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