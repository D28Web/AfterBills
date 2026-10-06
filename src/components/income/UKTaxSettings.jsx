import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ukTaxBreakdown, getCurrentTaxYear } from '@/lib/ukTax';
import { Info, Calculator } from 'lucide-react';

const FREQ_DIVISOR = {
  weekly: 52,
  fortnightly: 26,
  four_weekly: 13,
  monthly: 12,
};

const FREQ_LABEL = {
  weekly: 'week',
  fortnightly: 'fortnight',
  four_weekly: '4 weeks',
  monthly: 'month',
};

function Row({ label, value, currency, negative, bold, muted }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className={negative ? 'text-destructive/80' : bold ? 'text-primary' : ''}>
        {negative ? '−' : ''}{currency}{Math.abs(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export default function UKTaxSettings({ taxSettings, onChange, payFrequency, currency = '£' }) {
  const {
    grossAnnual = '',
    taxCode = '1257L',
    studentLoanPlan = 'none',
    pensionType = 'percent',
    pensionValue = '',
    pensionIsSalarySacrifice = false,
    salarySacrificeMonthly = '',
    otherDeductionsMonthly = '',
  } = taxSettings;

  const set = (key, val) => onChange({ ...taxSettings, [key]: val });

  const gross = parseFloat(grossAnnual) || 0;
  const salarySacrificeAnnual = (parseFloat(salarySacrificeMonthly) || 0) * 12;
  const otherDeductionsAnnual = (parseFloat(otherDeductionsMonthly) || 0) * 12;

  const breakdown = gross > 0
    ? ukTaxBreakdown({
        grossAnnual: gross,
        taxCode,
        studentLoanPlan,
        pensionType,
        pensionValue: parseFloat(pensionValue) || 0,
        pensionIsSalarySacrifice,
        salarySacrificeAnnual,
        otherDeductionsAnnual,
      })
    : null;

  const txYear = getCurrentTaxYear();
  const divisor = FREQ_DIVISOR[payFrequency] || 12;
  const perCycleLabel = FREQ_LABEL[payFrequency] || 'month';
  const perCycle = breakdown ? breakdown.takeHomeAnnual / divisor : 0;

  return (
    <div className="space-y-4">
      {/* Tax year badge */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
        <span>Using <strong>{txYear.label}</strong> UK tax rules — automatically updates each April.</span>
      </div>

      {/* Gross salary */}
      <div>
        <Label>Annual Gross Salary</Label>
        <Input
          type="number"
          step="1"
          placeholder="e.g. 35000"
          value={grossAnnual}
          onChange={e => set('grossAnnual', e.target.value)}
        />
      </div>

      {/* Tax code */}
      <div>
        <Label>Tax Code</Label>
        <Input
          type="text"
          placeholder="e.g. 1257L"
          value={taxCode}
          onChange={e => set('taxCode', e.target.value.toUpperCase())}
          maxLength={8}
        />
        <p className="text-xs text-muted-foreground mt-1">Find yours on your payslip or HMRC app. Default is 1257L.</p>
      </div>

      {/* Pension */}
      <div className="space-y-2">
        <Label>Pension Contribution</Label>
        <div className="flex gap-2">
          <Select value={pensionType} onValueChange={v => set('pensionType', v)}>
            <SelectTrigger className="w-36 flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed (£/yr)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder={pensionType === 'percent' ? 'e.g. 5' : 'e.g. 2000'}
            value={pensionValue}
            onChange={e => set('pensionValue', e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={pensionIsSalarySacrifice} onCheckedChange={v => set('pensionIsSalarySacrifice', v)} />
          <span className="text-xs font-medium">Paid via salary sacrifice</span>
        </label>
        <p className="text-xs text-muted-foreground">
          {pensionIsSalarySacrifice
            ? 'Salary sacrifice: deducted from gross before Income Tax AND National Insurance — biggest take-home saving.'
            : 'Relief at source / net pay: deducted before Income Tax but does not reduce National Insurance.'}
        </p>
      </div>

      {/* Student loan */}
      <div>
        <Label>Student Loan</Label>
        <Select value={studentLoanPlan} onValueChange={v => set('studentLoanPlan', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="plan1">Plan 1 (pre-2012, Scotland / NI)</SelectItem>
            <SelectItem value="plan2">Plan 2 (post-2012 England / Wales)</SelectItem>
            <SelectItem value="plan4">Plan 4 (Scotland post-2021)</SelectItem>
            <SelectItem value="plan5">Plan 5 (England / Wales from 2023)</SelectItem>
            <SelectItem value="postgrad">Postgraduate Loan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Salary sacrifice */}
      <div>
        <Label>Salary Sacrifice Deductions (per month)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 100"
          value={salarySacrificeMonthly}
          onChange={e => set('salarySacrificeMonthly', e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">e.g. cycle to work, childcare vouchers. Reduces gross before tax & NI.</p>
      </div>

      {/* Other deductions */}
      <div>
        <Label>Other Recurring Deductions (per month)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 50"
          value={otherDeductionsMonthly}
          onChange={e => set('otherDeductionsMonthly', e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">Any other post-tax deductions from your pay (e.g. union fees).</p>
      </div>

      {/* Breakdown panel */}
      {breakdown && (
        <div className="bg-muted/50 rounded-xl border border-border p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold font-heading">Estimated Income Summary</span>
            <span className="text-xs text-muted-foreground ml-auto">{txYear.label}</span>
          </div>

          <Row label="Annual gross salary" value={breakdown.grossAnnual} currency={currency} />

          {breakdown.salarySacrifice > 0 && (
            <Row label="Salary sacrifice" value={breakdown.salarySacrifice} currency={currency} negative muted />
          )}
          {breakdown.pensionDeduction > 0 && (
            <Row label={pensionIsSalarySacrifice ? 'Pension (salary sacrifice)' : 'Pension contribution'} value={breakdown.pensionDeduction} currency={currency} negative muted />
          )}

          <div className="border-t border-border/60 pt-2 mt-1 space-y-1.5">
            <Row label="Income Tax" value={breakdown.incomeTax} currency={currency} negative muted />
            <Row label="National Insurance" value={breakdown.nationalInsurance} currency={currency} negative muted />
            {breakdown.studentLoanDeduction > 0 && (
              <Row label="Student loan repayment" value={breakdown.studentLoanDeduction} currency={currency} negative muted />
            )}
            {breakdown.otherDeductions > 0 && (
              <Row label="Other deductions" value={breakdown.otherDeductions} currency={currency} negative muted />
            )}
          </div>

          <div className="border-t border-border pt-2 space-y-1.5">
            <Row label="Est. annual take-home" value={breakdown.takeHomeAnnual} currency={currency} bold />
            <Row label={`Est. take-home per ${perCycleLabel}`} value={perCycle} currency={currency} bold />
          </div>

          <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
            All figures are estimates only. Does not account for employer contributions, HMRC adjustments, or tax code changes during the year.
          </p>
        </div>
      )}
    </div>
  );
}