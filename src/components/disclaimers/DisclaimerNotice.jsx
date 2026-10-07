import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHORT_NOTICES } from '@/lib/disclaimers';

/**
 * Compact inline notice shown beside projections and recommendations.
 * Renders a small "Illustrative only" / "Not financial advice" pill so the
 * context is clear without dominating the UI.
 */
export default function DisclaimerNotice({
  label = SHORT_NOTICES.illustrative,
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5',
        className,
      )}
    >
      <Info className="w-2.5 h-2.5 shrink-0" />
      {label}
    </span>
  );
}