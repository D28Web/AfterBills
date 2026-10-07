// Finance tracking calculations for financed commitments (mortgages, loans, car finance, etc.)
// Provides labels, type checks, and progress/interest/term calculations.

export const FINANCE_TYPE_LABELS = {
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  hp: 'Hire Purchase (HP)',
  pcp: 'PCP Car Finance',
  car_loan: 'Car Loan',
  student_loan: 'Student Loan',
  credit_agreement: 'Credit Agreement',
  other_finance: 'Other Finance',
};

export const FINANCE_TYPE_KEYS = Object.keys(FINANCE_TYPE_LABELS);

export const INTEREST_TYPE_LABELS = {
  fixed: 'Fixed',
  tracker: 'Tracker',
  variable: 'Variable',
  discount: 'Discount',
  other: 'Other',
};

const PAYMENTS_PER_YEAR = {
  weekly: 52,
  fortnightly: 26,
  four_weekly: 13,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

export function isFinanceBill(bill) {
  return !!bill?.finance_type;
}

// Which finance types should show the balloon payment field
export function hasBalloonPayment(financeType) {
  return financeType === 'pcp' || financeType === 'hp';
}

// Which finance types use interest_type (rate type) instead of just APR
export function usesInterestType(financeType) {
  return financeType === 'mortgage' || financeType === 'student_loan';
}

// Which finance types show the property value + LTV fields
export function isMortgage(financeType) {
  return financeType === 'mortgage';
}

function monthsBetween(start, end) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate finance tracking metrics for a financed commitment bill.
 * Returns null if the bill is not a finance bill.
 * All estimates are approximate — based on simple amortisation assumptions,
 * not a full amortisation schedule. The user enters balance/term manually.
 */
export function calculateFinanceTracking(bill) {
  if (!bill?.finance_type) return null;

  const originalBalance = bill.original_balance || 0;
  const remainingBalance = bill.remaining_balance || 0;
  const capitalRepaid = Math.max(0, originalBalance - remainingBalance);
  const percentRepaid = originalBalance > 0 ? (capitalRepaid / originalBalance) * 100 : 0;

  const startDate = bill.start_date ? new Date(bill.start_date) : null;
  const now = new Date();
  const paymentsPerYear = PAYMENTS_PER_YEAR[bill.frequency] || 12;
  const monthsPerPayment = 12 / paymentsPerYear;

  // Payments made since start
  let paymentsMade = 0;
  if (startDate) {
    const monthsSinceStart = Math.max(0, monthsBetween(startDate, now));
    paymentsMade = Math.floor(monthsSinceStart / monthsPerPayment);
  }

  const regularPayment = bill.amount || 0;
  const totalPaid = paymentsMade * regularPayment;
  const estimatedInterestPaid = Math.max(0, round2(totalPaid - capitalRepaid));

  // Remaining term
  let remainingTermMonths = bill.remaining_term_months;
  if (remainingTermMonths == null && bill.agreement_end_date) {
    remainingTermMonths = Math.max(0, monthsBetween(now, new Date(bill.agreement_end_date)));
  }
  if (remainingTermMonths == null && bill.original_term_months && startDate) {
    const elapsed = monthsBetween(startDate, now);
    remainingTermMonths = Math.max(0, bill.original_term_months - elapsed);
  }

  // Estimated remaining interest
  const remainingPayments = remainingTermMonths != null ? Math.ceil(remainingTermMonths / monthsPerPayment) : 0;
  const totalRemainingPayments = remainingPayments * regularPayment;
  const estimatedRemainingInterest = Math.max(0, round2(totalRemainingPayments - remainingBalance - (bill.balloon_payment || 0)));

  // Mortgage-specific: LTV and equity
  let loanToValue = null;
  let equity = null;
  if (bill.finance_type === 'mortgage' && bill.property_value && bill.property_value > 0) {
    loanToValue = round2((remainingBalance / bill.property_value) * 100);
    equity = round2(bill.property_value - remainingBalance);
  }

  // Overpayment (monthly equivalent)
  let overpaymentMonthly = 0;
  if (bill.overpayment_amount && bill.overpayment_frequency) {
    const oppPerYear = PAYMENTS_PER_YEAR[bill.overpayment_frequency] || 12;
    overpaymentMonthly = round2((bill.overpayment_amount * oppPerYear) / 12);
  }

  // Estimated payoff date
  let estimatedPayoffDate = null;
  if (remainingTermMonths != null && remainingTermMonths > 0) {
    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + remainingTermMonths);
    estimatedPayoffDate = payoff;
  }

  // Early repayment charge (if percentage, compute the amount)
  let earlyRepaymentChargeAmount = null;
  if (bill.early_repayment_charge != null) {
    if (bill.early_repayment_charge_type === 'percentage') {
      earlyRepaymentChargeAmount = round2((bill.early_repayment_charge / 100) * remainingBalance);
    } else {
      earlyRepaymentChargeAmount = bill.early_repayment_charge;
    }
  }

  return {
    financeType: bill.finance_type,
    financeLabel: FINANCE_TYPE_LABELS[bill.finance_type] || 'Finance',
    originalBalance,
    remainingBalance,
    capitalRepaid,
    percentRepaid: round2(percentRepaid),
    paymentsMade,
    regularPayment,
    totalPaid: round2(totalPaid),
    estimatedInterestPaid,
    remainingTermMonths,
    estimatedRemainingInterest,
    balloonPayment: bill.balloon_payment || null,
    loanToValue,
    equity,
    propertyValue: bill.property_value || null,
    overpaymentMonthly,
    estimatedPayoffDate,
    interestRate: bill.interest_rate || null,
    interestType: bill.interest_type || null,
    interestTypeLabel: INTEREST_TYPE_LABELS[bill.interest_type] || null,
    apr: bill.apr || null,
    fixedRateEndDate: bill.fixed_rate_end_date || null,
    agreementEndDate: bill.agreement_end_date || null,
    earlyRepaymentCharge: bill.early_repayment_charge || null,
    earlyRepaymentChargeType: bill.early_repayment_charge_type || null,
    earlyRepaymentChargeAmount,
  };
}