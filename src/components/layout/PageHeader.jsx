// Shared responsive page header. Stacks title above actions on mobile, then
// switches to a single justified row at the sm breakpoint. Consolidates the
// repeated title/subtitle/actions markup that was duplicated across pages.
export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
          {actions}
        </div>
      )}
    </div>
  );
}