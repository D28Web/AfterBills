import { ukTaxBreakdown } from './ukTax';
import { roundMoney } from './money';
import { startOfDay } from 'date-fns';

// Multiplier to convert a per-occurrence amount into a monthly amount.
export const FREQ_TO_MONTHLY = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  four_weekly: 13 / 12,
  monthly: 1,
  quarterly: 4 / 12,
  annually: 1 / 12,
  irregular: 0,
};

export const INCOME_TYPE_LABELS = {
  salary: 'Salary',
  overtime: 'Overtime',
  second_job: 'Second Job',
  freelance: 'Freelance',
  benefits: 'Benefits',
  pension: 'Pension',
  bonus: 'Bonus',
  other: 'Other',
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
  if (stream.frequency === 'irregular') return 0;
  return roundMoney(raw * (FREQ_TO_MONTHLY[stream.frequency] || 1));
}

/**
 * Find the active 'amount' scheduled change active on a given date.
 * Changes are sorted by effective_date; the last one whose [effective, end]
 * window contains the date wins.
 */
export function getActiveAmountChange(stream, date) {
  const target = startOfDay(new Date(date));
  const changes = (stream?.scheduled_changes || [])
    .filter(c => c.change_type === 'amount' && c.effective_date)
    .sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));
  let active = null;
  for (const c of changes) {
    const eff = startOfDay(new Date(c.effective_date));
    const end = c.end_date ? startOfDay(new Date(c.end_date)) : null;
    if (target >= eff && (!end || target <= end)) active = c;
  }
  return active;
}

/**
 * Effective per-occurrence amount for a variable income stream on a date.
 * Uses actual > confirmed > expected (with optional conservative %), else
 * the stream's base amount (with optional conservative %).
 */
export function getEffectiveVariableAmount(stream, date) {
  const target = startOfDay(new Date(date));
  const period = (stream?.variable_periods || []).find(p => {
    if (!p.period_date) return false;
    return startOfDay(new Date(p.period_date)).getTime() === target.getTime();
  });
  let amount;
  let isConfirmed = false;
  if (period) {
    if (period.actual_amount != null) { amount = parseFloat(period.actual_amount) || 0; isConfirmed = true; }
    else if (period.confirmed_amount != null) { amount = parseFloat(period.confirmed_amount) || 0; isConfirmed = true; }
    else amount = period.expected_amount != null ? parseFloat(period.expected_amount) || 0 : (parseFloat(stream.amount) || 0);
  } else {
    amount = parseFloat(stream.amount) || 0;
  }
  if (!isConfirmed && stream.variable_forecast_percent != null) {
    amount = amount * (parseFloat(stream.variable_forecast_percent) / 100);
  }
  return roundMoney(amount);
}

/**
 * Effective per-occurrence take-home amount for a stream on a given date,
 * considering scheduled amount changes (net amount or salary gross) and
 * variable periods.
 */
export function getEffectiveStreamOccurrenceAmount(stream, date) {
  if (!stream) return 0;
  if (stream.is_variable) return getEffectiveVariableAmount(stream, date);
  const change = getActiveAmountChange(stream, date);
  if (stream.income_mode === 'salary') {
    const ts = stream.tax_settings || {};
    const gross = change?.gross_annual != null ? parseFloat(change.gross_annual) : (parseFloat(ts.grossAnnual) || 0);
    if (gross <= 0) return 0;
    const takeHomeMonthly = ukTaxBreakdown({ ...ts, grossAnnual: gross }).takeHomeMonthly;
    const multiplier = FREQ_TO_MONTHLY[stream.frequency] || 1;
    return roundMoney(takeHomeMonthly / multiplier);
  }
  return parseFloat(change?.amount != null ? change.amount : stream.amount) || 0;
}

/**
 * Effective per-cycle income for the PRIMARY stream on a given payday date.
 * Uses `baseMonthlyIncome` as the current monthly base (so What If overrides
 * work), with scheduled amount changes resolved per payday.
 */
export function getEffectivePrimaryCycleIncome(ctx, date, baseMonthlyIncome) {
  if (!ctx) return 0;
  const freq = ctx.pay_frequency || 'monthly';
  if (freq === 'irregular') return 0;
  const multiplier = FREQ_TO_MONTHLY[freq] || 1;
  if (ctx.is_variable) return getEffectiveVariableAmount(ctx, date);
  const change = getActiveAmountChange(ctx, date);
  if (change) {
    if (ctx.income_mode === 'salary' && change.gross_annual != null) {
      const ts = ctx.tax_settings || {};
      const gross = parseFloat(change.gross_annual);
      if (gross <= 0) return 0;
      return roundMoney(ukTaxBreakdown({ ...ts, grossAnnual: gross }).takeHomeMonthly / multiplier);
    }
    if (ctx.income_mode !== 'salary' && change.amount != null) {
      return parseFloat(change.amount) || 0;
    }
  }
  return roundMoney((baseMonthlyIncome || 0) / multiplier);
}

/**
 * Effective monthly income for the PRIMARY stream for a calendar month
 * (monthly-pay path). Resolves scheduled amount changes by month start.
 */
export function getEffectivePrimaryMonthlyIncome(ctx, month, year, baseMonthlyIncome) {
  if (!ctx) return 0;
  const freq = ctx.pay_frequency || 'monthly';
  if (freq === 'irregular') return 0;
  if (ctx.end_date) {
    const endDate = new Date(ctx.end_date);
    if (year > endDate.getFullYear() || (year === endDate.getFullYear() && month > endDate.getMonth())) return 0;
  }
  const multiplier = FREQ_TO_MONTHLY[freq] || 1;
  const monthDate = new Date(year, month, 1);
  if (ctx.is_variable) return getEffectiveVariableAmount(ctx, monthDate);
  const change = getActiveAmountChange(ctx, monthDate);
  if (change) {
    if (ctx.income_mode === 'salary' && change.gross_annual != null) {
      const ts = ctx.tax_settings || {};
      const gross = parseFloat(change.gross_annual);
      if (gross <= 0) return 0;
      return roundMoney(ukTaxBreakdown({ ...ts, grossAnnual: gross }).takeHomeMonthly);
    }
    if (ctx.income_mode !== 'salary' && change.amount != null) {
      return roundMoney(parseFloat(change.amount) * multiplier);
    }
  }
  return baseMonthlyIncome || 0;
}

// Build a user-like context (monthly_income + pay schedule) from the primary
// income stream, falling back to legacy User-entity fields for users who
// haven't yet saved their income into an IncomeStream record. Enriched with
// income-resolution fields so the forecast engine can resolve scheduled
// changes and variable amounts per date.
export function getPrimaryIncomeContext(incomeStreams = [], user = null) {
  const primary = getPrimaryStream(incomeStreams);
  if (primary) {
    return {
      monthly_income: getStreamMonthlyAmount(primary),
      pay_frequency: primary.frequency || 'monthly',
      pay_start_date: primary.start_date || null,
      pay_day: primary.pay_day != null ? primary.pay_day : null,
      pay_weekday: primary.pay_weekday || 'none',
      income_mode: primary.income_mode || 'net',
      tax_settings: primary.tax_settings || null,
      is_variable: primary.is_variable || false,
      variable_periods: primary.variable_periods || [],
      variable_forecast_percent: primary.variable_forecast_percent,
      amount: primary.amount,
      scheduled_changes: primary.scheduled_changes || [],
      end_date: primary.end_date || null,
    };
  }
  return {
    monthly_income: user?.monthly_income || 0,
    pay_frequency: user?.pay_frequency || 'monthly',
    pay_start_date: user?.pay_start_date || null,
    pay_day: user?.pay_day != null ? user?.pay_day : null,
    pay_weekday: user?.pay_weekday || 'none',
    income_mode: 'net',
    tax_settings: null,
    is_variable: false,
    variable_periods: [],
    variable_forecast_percent: null,
    amount: user?.monthly_income || 0,
    scheduled_changes: [],
    end_date: null,
  };
}

/**
 * Resolve the income parameters for generateForecast.
 *
 * For a regular primary stream, the primary's monthly equivalent is passed
 * as `monthlyIncome` (base) and only other streams go into `incomeStreams`.
 * For an irregular primary stream, the base is 0 and ALL streams (including
 * the primary) go into `incomeStreams` so the irregular payment lands in the
 * correct month via getIncomeStreamAmountForMonth.
 */
export function getForecastIncomeParams(incomeStreams = [], user = null) {
  const primary = getPrimaryStream(incomeStreams);
  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const isIrregularPrimary = primary?.frequency === 'irregular';
  return {
    monthlyIncome: isIrregularPrimary ? 0 : primaryCtx.monthly_income,
    incomeStreams: isIrregularPrimary ? (incomeStreams || []) : getOtherStreams(incomeStreams),
    primaryCtx,
  };
}