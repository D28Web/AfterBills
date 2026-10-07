import { cn } from '@/lib/utils';

// Sensible max content widths per page type.
// wide  — dashboards & data-heavy pages (~1400px, within the 1200-1440 range)
// form  — forms & settings, kept narrow for readability (~512px)
// full  — no max-width constraint
const MAX_WIDTHS = {
  wide: 'max-w-[1400px]',
  form: 'max-w-lg',
  full: 'max-w-none',
};

// Shared responsive page shell. Provides consistent horizontal + vertical
// padding at every breakpoint and a sensible max-width so content uses the
// available screen width on large/ultrawide displays instead of sitting in a
// narrow fixed column. Pages pick their own width via `maxWidth`.
export default function PageContainer({ maxWidth = 'wide', className, children }) {
  return (
    <div className={cn('mx-auto w-full p-4 sm:p-6 lg:p-8', MAX_WIDTHS[maxWidth] || MAX_WIDTHS.wide, className)}>
      {children}
    </div>
  );
}