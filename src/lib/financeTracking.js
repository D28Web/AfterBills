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

/**
 * Run a simple amortisation schedule to generate the outstanding balance,
 * total interest paid, and capital repaid from the original balance, interest
 * rate, regular payment, and the number of payments made so far.
 *
 * This is the reverse of the manual entry flow: instead of the user typing the
 * outstanding balance, the app generates it from the amount paid off + interest.
 *
 * Returns null if the inputs needed for a meaningful calculation are missing.
 */
export function generateOutstandingBalance(bill) {
  if (!bill) return null;
  const originalBalance = parseFloat(bill.original_balance);
  const rate = parseFloat(bill.interest_rate ?? bill.apr);
  const payment = parseFloat(bill.amount);
  if (!Number.isFinite(originalBalance) || originalBalance <= 0) return null;
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (!Number.isFinite(payment) || payment <= 0) return null;

  const paymentsPerYear = PAYMENTS_PER_YEAR[bill.frequency] || 12;
  const monthsPerPayment = 12 / paymentsPerYear;

  // Payments made since the agreement start date
  let paymentsMade = 0;
  if (bill.start_date) {
    const startDate = new Date(bill.start_date);
    if (!isNaN(startDate.getTime())) {
      const monthsSinceStart = Math.max(0, monthsBetween(startDate, new Date()));
      paymentsMade = Math.floor(monthsSinceStart / monthsPerPayment);
    }
  }
  if (bill.remaining_term_months != null && bill.original_term_months != null) {
    paymentsMade = Math.max(0, bill.original_term_months - bill.remaining_term_months);
  }

  const periodicRate = rate / 100 / paymentsPerYear;
  let balance = originalBalance;
  let totalInterest = 0;
  let totalCapital = 0;

  for (let i = 0; i < paymentsMade; i++) {
    const interest = balance * periodicRate;
    let capital = payment - interest;
    if (capital < 0) capital = 0; // payment doesn't cover interest
    if (capital > balance) capital = balance; // final payment
    balance -= capital;
    totalInterest += interest;
    totalCapital += capital;
    if (balance <= 0.005) { balance = 0; break; }
  }

  return {
    remainingBalance: round2(balance),
    totalInterestPaid: round2(totalInterest),
    totalCapitalRepaid: round2(totalCapital),
    totalPaid: round2(paymentsMade * payment),
    paymentsMade,
  };
}

// Which finance types should show the balloon payment field
export function hasBalloonPayment(financeType) {
  return financeType === 'pcp' || financeType === 'hp';
}

// Whether the regular payments will never pay off the balance (e.g. PCP,
// where a large balloon/GMFV is due at the end and the monthly payments
// only cover depreciation + interest). These should not show a projected
// payoff date from balance ÷ payment.
export function isBalloonFinance(bill) {
  if (!bill?.finance_type) return false;
  if (bill.finance_type === 'pcp') return true;
  // HP with a balloon payment set also has a lump sum at the end
  if (bill.finance_type === 'hp' && bill.balloon_payment > 0) return true;
  return false;
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
  // If the user hasn't entered a remaining balance, try to generate it from
  // the amortisation schedule (amount paid off + interest).
  let remainingBalance = bill.remaining_balance || 0;
  let generatedBalance = null;
  if (!remainingBalance) {
    generatedBalance = generateOutstandingBalance(bill);
    if (generatedBalance) {
      remainingBalance = generatedBalance.remainingBalance;
    }
  }
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

  // Estimated payoff date — not shown for balloon finance (PCP etc.) since
  // the regular payments never clear the balance; the balloon is due at the
  // agreement end date instead.
  let estimatedPayoffDate = null;
  if (!isBalloonFinance(bill) && remainingTermMonths != null && remainingTermMonths > 0) {
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
    balanceIsGenerated: !!generatedBalance,
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