import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { DISCLAIMER_SECTIONS } from '@/lib/disclaimers';

/**
 * Permanent Financial Disclaimer page.
 * Accessible from Settings, the sidebar footer, and any "learn more" link.
 * Presents every disclaimer in full so users always have a single reference.
 */
export default function FinancialDisclaimer() {
  return (
    <PageContainer maxWidth="form" className="space-y-6">
      <PageHeader
        title="Financial Disclaimer"
        subtitle="How AfterBills helps you understand your finances"
      />

      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            AfterBills is a planning tool, not a financial adviser
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The calculations, projections and suggestions in this app are
            educational and illustrative. They are not a substitute for
            professional financial advice tailored to your circumstances.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {DISCLAIMER_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <h3 className="text-sm font-semibold font-heading text-foreground">{section.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-2">
        <h3 className="text-sm font-semibold font-heading text-foreground">How to read our guidance</h3>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-5">
          <li><strong className="text-foreground">User-entered facts</strong> — the income, bills and goals you provide.</li>
          <li><strong className="text-foreground">Calculated estimates</strong> — figures derived from your data using standard assumptions.</li>
          <li><strong className="text-foreground">Modelled scenarios</strong> — projections that depend on assumptions and may not reflect actual outcomes.</li>
          <li><strong className="text-foreground">General guidance</strong> — educational observations, not personal recommendations.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed pt-1">
          AfterBills has not assessed your full financial circumstances or
          suitability for any particular financial product. Where a projection
          involves investment or pension growth, assumed rates are clearly
          labelled and can be adjusted — returns are never guaranteed.
        </p>
      </div>

      <Button variant="outline" asChild className="gap-2">
        <Link to="/settings">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>
      </Button>
    </PageContainer>
  );
}