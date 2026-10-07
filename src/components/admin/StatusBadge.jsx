import { cn } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const disabled = status === 'disabled';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      disabled
        ? 'bg-red-500/15 text-red-400 border-red-500/20'
        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    )}>
      {disabled ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
      {disabled ? 'Disabled' : 'Active'}
    </span>
  );
}