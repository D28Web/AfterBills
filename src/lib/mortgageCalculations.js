/**
 * Mortgage calculations: amortization, overpayment scenarios, rate-change
 * scenarios, deal tracking, and proactive insights.
 *
 * All figures are estimates based on standard amortization assumptions,
 * not lender-confirmed. Clearly label projected values in the UI.
 */
import { roundMoney, formatMoney } from './money';
import { INTEREST_TYPE_LABELS } from './financeTracking';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function monthlyRate(annualRatePercent) {
  if (!annualRatePercent) return 0;
  return annualRatePercent / 100 / 12;
}

const FREQ_PER_YEAR = {
  weekly: 52, fortnightly: 26, four_weekly: 13,
  monthly: 12, quarterly: 4, annually: 1,
};

/**
 * Calculate the monthly payment for an amortizing loan.
 * balance, annualRatePercent (e.g. 5.5), termMonths → monthly payment.
 */
export function calculateMonthlyPayment(balance, annualRatePercent, termMonths) {
  if (!balance || balance <= 0 || !termMonths || termMonths <= 0) return 0;
  const r = monthlyRate(annualRatePercent);
  if (r === 0) return round2(balance / termMonths);
  return round2(balance * r / (1 - Math.pow(1 + r, -termMonths)));
}

/**
 * Calculate months remaining given balance, rate, and payment.
 * Returns null if the payment doesn't cover the interest (never pays off).
 */
export function calculateRemainingMonths(balance, annualRatePercent, monthlyPayment) {
  if (!balance || balance <= 0) return 0;
  if (!monthlyPayment || monthlyPayment <= 0) return null;
  const r = monthlyRate(annualRatePercent);
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return null;
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r));
}

/**
 * Run a month-by-month amortization from a starting balance.
 * Returns { schedule, totalInterest, totalMonths, payoffDate }.
 */
export function amortize(startBalance, annualRatePercent, monthlyPayment, startDate = new Date(), maxMonths = 600) {
  const r = monthlyRate(annualRatePercent);
  let balance = Math.max(0, startBalance || 0);
  let totalInterest = 0;
  const schedule = [];

  for (let i = 0; i < maxMonths && balance > 0.01; i++) {
    const interest = balance * r;
    let principal = monthlyPayment - interest;
    if (principal <= 0) break;
    if (principal >= balance) {
      principal = balance;
      balance = 0;
    } else {
      balance -= principal;
    }
    totalInterest += interest;
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i + 1);
    schedule.push({
      month: i + 1,
      date,
      balance: round2(balance),
      interest: round2(interest),
      principal: round2(principal),
      cumulativeInterest: round2(totalInterest),
    });
  }

  return {
    schedule,
    totalInterest: round2(totalInterest),
    totalMonths: schedule.length,
    payoffDate: schedule.length > 0 ? schedule[schedule.length - 1].date : null,
  };
}

/** Balance after N months of amortization. */
export function balanceAtMonth(balance, annualRatePercent, monthlyPayment, month) {
  const r = monthlyRate(annualRatePercent);
  let bal = Math.max(0, balance || 0);
  for (let i = 0; i < month && bal > 0.01; i++) {
    const interest = bal * r;
    const principal = Math.min(monthlyPayment - interest, bal);
    if (principal <= 0) break;
    bal = Math.max(0, bal - principal);
  }
  return round2(bal);
}

/**
 * Overpayment scenario: extra monthly amount and/or one-off lump sum.
 * Returns the impact vs. the base (no overpayment) trajectory.
 */
export function overpaymentScenario(baseBalance, annualRatePercent, basePayment, extraMonthly = 0, lumpSum = 0) {
  const now = new Date();
  const base = amortize(baseBalance, annualRatePercent, basePayment, now);
  const adjustedBalance = Math.max(0, baseBalance - lumpSum);
  const newPayment = basePayment + extraMonthly;
  const scenario = amortize(adjustedBalance, annualRatePercent, newPayment, now);

  return {
    extraMonthly: round2(extraMonthly),
    lumpSum: round2(lumpSum),
    basePayoffDate: base.payoffDate,
    baseTotalInterest: base.totalInterest,
    baseTotalMonths: base.totalMonths,
    newPayoffDate: scenario.payoffDate,
    newTotalInterest: scenario.totalInterest,
    newTotalMonths: scenario.totalMonths,
    monthsSaved: Math.max(0, base.totalMonths - scenario.totalMonths),
    interestSaved: round2(Math.max(0, base.totalInterest - scenario.totalInterest)),
    newMonthlyPayment: round2(newPayment),
    schedule: scenario.schedule,
  };
}

/**
 * Rate-change scenario: what happens if the rate changes to newRate.
 * Lenders typically recalculate the payment to maintain the remaining term.
 */
export function rateChangeScenario(balance, currentRate, newRate, basePayment, remainingMonths) {
  const now = new Date();
  const term = remainingMonths || calculateRemainingMonths(balance, currentRate, basePayment) || 360;
  const newPayment = calculateMonthlyPayment(balance, newRate, term);
  const paymentChange = round2(newPayment - basePayment);

  const newAmort = amortize(balance, newRate, newPayment, now);
  const currentAmort = amortize(balance, currentRate, basePayment, now);

  return {
    currentRate: round2(currentRate),
    newRate: round2(newRate),
    currentPayment: round2(basePayment),
    newPayment: round2(newPayment),
    paymentChange,
    currentTotalInterest: currentAmort.totalInterest,
    newTotalInterest: newAmort.totalInterest,
    interestChange: round2(newAmort.totalInterest - currentAmort.totalInterest),
    remainingMonths: term,
  };
}

/** Current deal information: end date, time remaining, estimated balance at deal end. */
export function getDealInfo(bill) {
  const dealEndDate = bill.mortgage_deal_end_date || bill.fixed_rate_end_date;
  if (!dealEndDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(dealEndDate);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(0, Math.ceil((end - now) / msPerDay));
  const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30.44));

  const balance = bill.remaining_balance || 0;
  const rate = bill.interest_rate || 0;
  const payment = bill.amount || 0;
  let balanceAtDealEnd = null;
  if (balance > 0 && payment > 0 && monthsRemaining > 0) {
    balanceAtDealEnd = balanceAtMonth(balance, rate, payment, monthsRemaining);
  }

  return {
    dealEndDate: end,
    dealStartDate: bill.mortgage_deal_start_date ? new Date(bill.mortgage_deal_start_date) : null,
    monthsRemaining,
    daysRemaining,
    balanceAtDealEnd,
    isExpired: end < now,
  };
}

/** Format a month count as "X years Y months". */
export function formatTerm(months) {
  if (months == null || !isFinite(months)) return '—';
  if (months <= 0) return 'Paid off';
  const years = Math.floor(months / 12);
  const remMonths = Math.round(months % 12);
  if (years === 0) return `${remMonths} month${remMonths !== 1 ? 's' : ''}`;
  if (remMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} yr${years !== 1 ? 's' : ''} ${remMonths} mo`;
}

/** Comprehensive mortgage summary for display. */
export function getMortgageSummary(bill) {
  const balance = bill.remaining_balance || 0;
  const originalBalance = bill.original_balance || 0;
  const rate = bill.interest_rate || 0;
  const payment = bill.amount || 0;
  const now = new Date();

  const capitalRepaid = Math.max(0, originalBalance - balance);
  const percentRepaid = originalBalance > 0 ? round2((capitalRepaid / originalBalance) * 100) : 0;

  let remainingMonths = bill.remaining_term_months;
  if (remainingMonths == null || remainingMonths <= 0) {
    remainingMonths = calculateRemainingMonths(balance, rate, payment);
  }

  const amort = amortize(balance, rate, payment, now);

  const deal = getDealInfo(bill);

  let loanToValue = null;
  let equity = null;
  if (bill.property_value && bill.property_value > 0 && balance > 0) {
    loanToValue = round2((balance / bill.property_value) * 100);
    equity = roundMoney(bill.property_value - balance);
  }

  let overpaymentMonthly = 0;
  if (bill.overpayment_amount && bill.overpayment_frequency) {
    const perYear = FREQ_PER_YEAR[bill.overpayment_frequency] || 12;
    overpaymentMonthly = round2((bill.overpayment_amount * perYear) / 12);
  }

  let ercAmount = null;
  if (bill.early_repayment_charge != null && bill.early_repayment_charge > 0) {
    if (bill.early_repayment_charge_type === 'percentage') {
      ercAmount = round2((bill.early_repayment_charge / 100) * balance);
    } else {
      ercAmount = bill.early_repayment_charge;
    }
  }

  // Original term in years (for display)
  const originalTermYears = bill.original_term_months ? Math.round(bill.original_term_months / 12 * 10) / 10 : null;

  return {
    balance,
    originalBalance,
    capitalRepaid,
    percentRepaid,
    rate,
    payment,
    interestType: bill.interest_type,
    interestTypeLabel: INTEREST_TYPE_LABELS[bill.interest_type] || null,
    remainingMonths,
    originalTermMonths: bill.original_term_months || null,
    originalTermYears,
    estimatedRemainingInterest: amort.totalInterest,
    estimatedPayoffDate: amort.payoffDate,
    deal,
    loanToValue,
    equity,
    propertyValue: bill.property_value || null,
    overpaymentMonthly,
    annualOverpaymentAllowance: bill.annual_overpayment_allowance || null,
    ercAmount,
    ercPercent: bill.early_repayment_charge_type === 'percentage' ? bill.early_repayment_charge : null,
    ercEndDate: bill.mortgage_deal_end_date || bill.fixed_rate_end_date || null,
    balanceReconciliationHistory: bill.balance_reconciliation_history || [],
    startDate: bill.start_date || null,
  };
}

/** Generate proactive, non-intrusive mortgage insights. */
export function generateMortgageInsights(bill, summary) {
  const insights = [];
  const { balance, rate, payment, deal, remainingMonths, estimatedRemainingInterest } = summary;
  const cur = '£';

  // Deal expiry warning
  if (deal && !deal.isExpired && deal.monthsRemaining <= 12 && deal.monthsRemaining > 0) {
    insights.push({
      tone: 'warning',
      icon: 'CalendarClock',
      text: `Your ${summary.interestTypeLabel || 'current'} mortgage deal ends in ${deal.monthsRemaining} month${deal.monthsRemaining !== 1 ? 's' : ''}.`,
    });
  }

  // Remaining interest projection
  if (estimatedRemainingInterest > 0) {
    insights.push({
      tone: 'info',
      icon: 'Percent',
      text: `You are currently projected to pay approximately ${formatMoney(estimatedRemainingInterest, { currency: cur, decimals: 0 })} in remaining interest.`,
    });
  }

  // £50/month overpayment suggestion
  if (balance > 0 && rate > 0 && payment > 0) {
    const scenario50 = overpaymentScenario(balance, rate, payment, 50);
    if (scenario50.monthsSaved > 0) {
      insights.push({
        tone: 'positive',
        icon: 'TrendingDown',
        text: `Increasing your payment by £50/month could reduce your term by approximately ${scenario50.monthsSaved} months and save approximately ${formatMoney(scenario50.interestSaved, { currency: cur, decimals: 0 })} in interest.`,
      });
    }

    // £2,000 lump sum suggestion
    const lumpSum2000 = overpaymentScenario(balance, rate, payment, 0, 2000);
    if (lumpSum2000.interestSaved > 0) {
      insights.push({
        tone: 'positive',
        icon: 'PoundSterling',
        text: `A £2,000 lump-sum overpayment could save approximately ${formatMoney(lumpSum2000.interestSaved, { currency: cur, decimals: 0 })} in interest.`,
      });
    }

    // 1% rate increase warning (only near deal end)
    if (deal && !deal.isExpired && deal.monthsRemaining > 0 && deal.monthsRemaining <= 12) {
      const rateChange = rateChangeScenario(deal.balanceAtDealEnd || balance, rate, rate + 1, payment, remainingMonths);
      if (rateChange.paymentChange > 0) {
        insights.push({
          tone: 'warning',
          icon: 'TrendingUp',
          text: `If your next rate were 1% higher, your estimated payment would increase by approximately ${formatMoney(rateChange.paymentChange, { currency: cur, decimals: 0 })}/month.`,
        });
      }
    }
  }

  return insights;
}