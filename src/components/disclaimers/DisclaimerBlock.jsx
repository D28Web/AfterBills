import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A proportionate disclaimer block for dialogs and modelling tools.
 * Shows the provided text with an info icon — not a large red warning,
 * just a clear, calm caveat that sits naturally beside the content.
 */
export default function DisclaimerBlock({ text, className, icon: Icon = AlertCircle }) {
  if (!text) return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3',
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}