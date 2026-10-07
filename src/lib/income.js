import { ukTaxBreakdown } from './ukTax';
import { roundMoney } from './money';

// Multiplier to convert a per-occurrence amount into a monthly amount.
export const FREQ_TO_MONTHLY = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  four_weekly: 13 / 12,
  monthly: 1,
  quarterly: 4 / 12,
  annually: 1 / 12,
};

// The user's main income stream (holds the pay schedule + tax settings).
export function getPrimaryStream(incomeStreams = []) {
  return (incomeStreams || []).find(s => s.is_primary) || null;
}

// Additional ("other") income streams, excluding the primary one.
export function getOtherStreams(incomeStreams = []) {
  return (incomeStreams || []).filter(s => !s.is_primary);
}

// Normalized monthly take-home for a single income stream.
// - net mode: amount is the take-home per cycle, scaled by frequency.
// - salary mode: take-home is derived from tax_settings via UK tax breakdown.
export function getStreamMonthlyAmount(stream) {
  if (!stream) return 0;
  if (stream.income_mode === 'salary') {
    const ts = stream.tax_settings || {};
    const grossAnnual = parseFloat(ts.grossAnnual) || 0;
    if (grossAnnual <= 0) return 0;
    return roundMoney(ukTaxBreakdown({
      grossAnnual,
      taxCode: ts.taxCode,
      studentLoanPlan: ts.studentLoanPlan,
      pensionType: ts.pensionType,
      pensionValue: parseFloat(ts.pensionValue) || 0,
      pensionIsSalarySacrifice: ts.pensionIsSalarySacrifice,
      salarySacrificeAnnual: (parseFloat(ts.salarySacrificeMonthly) || 0) * 12,
      otherDeductionsAnnual: (parseFloat(ts.otherDeductionsMonthly) || 0) * 12,
    }).takeHomeMonthly);
  }
  const raw = parseFloat(stream.amount) || 0;
  return roundMoney(raw * (FREQ_TO_MONTHLY[stream.frequency] || 1));
}

// Build a user-like context (monthly_income + pay schedule) from the primary
// income stream, falling back to legacy User-entity fields for users who
// haven't yet saved their income into an IncomeStream record.
export function getPrimaryIncomeContext(incomeStreams = [], user = null) {
  const primary = getPrimaryStream(incomeStreams);
  if (primary) {
    return {
      monthly_income: getStreamMonthlyAmount(primary),
      pay_frequency: primary.frequency || 'monthly',
      pay_start_date: primary.start_date || null,
      pay_day: primary.pay_day != null ? primary.pay_day : null,
      pay_weekday: primary.pay_weekday || 'none',
    };
  }
  return {
    monthly_income: user?.monthly_income || 0,
    pay_frequency: user?.pay_frequency || 'monthly',
    pay_start_date: user?.pay_start_date || null,
    pay_day: user?.pay_day != null ? user?.pay_day : null,
    pay_weekday: user?.pay_weekday || 'none',
  };
}