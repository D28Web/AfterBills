/**
 * Financial Planning & Affordability calculations.
 *
 * Reuses the existing What If forecasting engine (generateForecast,
 * billToMonthlyCost, getPayCycles, getBillsInCycle) rather than duplicating
 * simulation logic. All figures are planning projections only — nothing here
 * touches live financial data.
 */
import { addMonths, startOfMonth, startOfDay, differenceInCalendarMonths } from 'date-fns';
import {
  generateForecast,
  billToMonthlyCost,
  getBillAmountForMonth,
  getBillShare,
} from './forecast';
import { getPayCycles, getBillOccurrencesInWindow, getBillsInCycle, formatCycleLabel } from './payday';
import { FREQ_TO_MONTHLY } from './income';
import { roundMoney, sumMoney } from './money';

/**
 * Amount a proposed commitment contributes in a given calendar month,
 * respecting its optional start and end dates.
 */
function getCommitmentAmountForMonth(commitment, month, year) {
  if (commitment.start_date) {
    const start = new Date(commitment.start_date);
    if (year < start.getFullYear() || (year === start.getFullYear() && month < start.getMonth())) return 0;
  }
  if (commitment.end_date) {
    const end = new Date(commitment.end_date);
    if (year > end.getFullYear() || (year === end.getFullYear() && month > end.getMonth())) return 0;
  }
  return getBillAmountForMonth({
    amount: commitment.amount,
    frequency: commitment.frequency,
    start_date: commitment.start_date,
    is_split: false,
  }, month, year);
}

/**
 * Affordability Checker — tests a proposed recurring commitment against the
 * user's current forecast.
 *
 * @param {object} commitment - { name, amount, frequency, start_date, end_date?, category }
 */
export function getAffordabilityStats({ bills, income, primaryCtx, commitment }) {
  const commitBill = {
    name: commitment.name,
    amount: commitment.amount,
    frequency: commitment.frequency,
    start_date: commitment.start_date,
    category: commitment.category || 'other',
    is_recurring: true,
    is_split: false,
  };

  const realForecast = generateForecast(bills, income, new Date(), [], primaryCtx);
  const simForecast = realForecast.map(m => {
    const commitAmt = getCommitmentAmountForMonth(commitment, m.month, m.year);
    return {
      ...m,
      commitAmt,
      remaining: roundMoney(m.remaining - commitAmt),
    };
  });

  const realMonthlyBills = sumMoney(bills.map(b => billToMonthlyCost(b)));
  const commitMonthly = billToMonthlyCost(commitBill);
  const realRemaining = roundMoney(income - realMonthlyBills);
  const simRemaining = roundMoney(realRemaining - commitMonthly);
  const monthlyImpact = roundMoney(0 - commitMonthly);
  const annualImpact = roundMoney(monthlyImpact * 12);

  const lowestBuffer = roundMoney(Math.min(...simForecast.map(m => m.remaining)));
  const negativeMonths = simForecast.filter(m => m.remaining < 0);
  const hasNegative = negativeMonths.length > 0;

  // Effect on upcoming pay cycles + Safe to Spend
  const freq = primaryCtx?.pay_frequency || 'monthly';
  const cycleIncome = income / (FREQ_TO_MONTHLY[freq] || 1);
  const cycles = getPayCycles(primaryCtx, 4);
  const cycleEffects = cycles.map((cycle, i) => {
    const occurrences = getBillOccurrencesInWindow(commitBill, cycle.start, cycle.end)
      .filter(d => !commitment.end_date || d <= startOfDay(new Date(commitment.end_date)));
    const commitTotal = roundMoney(occurrences.length * getBillShare(commitBill));
    const realCycleBills = getBillsInCycle(bills, cycle.start, cycle.end);
    const realTotal = roundMoney(realCycleBills.reduce((s, b) => s + (b.monthAmount || b.amount), 0));
    const realSpare = roundMoney(cycleIncome - realTotal);
    const simSpare = roundMoney(realSpare - commitTotal);
    return { cycle, index: i, label: formatCycleLabel(cycle, i), commitTotal, realSpare, simSpare };
  });

  const safeToSpendReduction = cycleEffects[0]?.commitTotal || commitMonthly;

  return {
    realRemaining,
    simRemaining,
    monthlyImpact,
    annualImpact,
    lowestBuffer,
    hasNegative,
    negativeMonthsCount: negativeMonths.length,
    cycleEffects,
    safeToSpendReduction,
    commitMonthly,
    realForecast,
    simForecast,
  };
}

/**
 * Large Purchase Planner — projects what it takes to fund a future purchase.
 *
 * @param {object} purchase - { name, target_cost, target_date, allocated }
 */
export function getPurchaseStats({ bills, income, primaryCtx, purchase }) {
  const targetCost = parseFloat(purchase.target_cost) || 0;
  const allocated = parseFloat(purchase.allocated) || 0;
  const remaining = roundMoney(Math.max(0, targetCost - allocated));
  const targetDate = purchase.target_date ? new Date(purchase.target_date) : null;
  const now = startOfMonth(new Date());
  const monthsUntilTarget = targetDate ? Math.max(0, differenceInCalendarMonths(targetDate, now)) : 0;
  const requiredMonthly = monthsUntilTarget > 0 ? roundMoney(remaining / monthsUntilTarget) : remaining;

  const freq = primaryCtx?.pay_frequency || 'monthly';
  const cycleMultiplier = FREQ_TO_MONTHLY[freq] || 1;
  const requiredPerCycle = roundMoney(requiredMonthly / cycleMultiplier);

  const monthlyBills = sumMoney(bills.map(b => billToMonthlyCost(b)));
  const monthlySpare = roundMoney(income - monthlyBills);
  const leftAfterPurchase = roundMoney(monthlySpare - requiredMonthly);

  let earliestDate = null;
  if (remaining > 0 && monthlySpare > 0) {
    const monthsNeeded = Math.ceil(remaining / monthlySpare);
    earliestDate = addMonths(now, monthsNeeded);
  }

  // Alternative target date comparison
  const alternatives = [3, 6, 12, 24].map(m => ({
    months: m,
    date: addMonths(now, m),
    requiredMonthly: remaining > 0 ? roundMoney(remaining / m) : 0,
  }));

  return {
    targetCost,
    allocated,
    remaining,
    monthsUntilTarget,
    requiredMonthly,
    requiredPerCycle,
    monthlySpare,
    leftAfterPurchase,
    earliestDate,
    alternatives,
    affordable: monthlySpare >= requiredMonthly && requiredMonthly > 0,
  };
}