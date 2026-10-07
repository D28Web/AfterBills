/**
 * Emergency Fund calculations.
 *
 * An emergency fund is a specialised savings goal whose target can be a fixed
 * amount or N months of essential expenses. All figures are planning data —
 * nothing connects to real financial accounts.
 */
import { addMonths, startOfMonth } from 'date-fns';
import { roundMoney } from './money';
import { FREQ_TO_MONTHLY } from './income';
import { getMonthlyEssentialExpenses } from './essential';

/**
 * Compute all derived stats for an emergency fund goal.
 *
 * @param {object} goal  - SavingsGoal with is_emergency_fund / target_type / target_months
 * @param {Array}  bills - Bill records (to compute essential expenses)
 * @param {number} monthlySpare - spare income after bills (savings capacity)
 * @param {object} primaryCtx - income context with pay_frequency
 */
export function getEmergencyFundStats(goal, bills, monthlySpare, primaryCtx) {
  const monthlyEssential = getMonthlyEssentialExpenses(bills);

  const target = goal.target_type === 'months'
    ? roundMoney(monthlyEssential * (parseFloat(goal.target_months) || 0))
    : Math.max(0, parseFloat(goal.target_amount) || 0);

  const current = Math.max(0, parseFloat(goal.current_amount) || 0);
  const remaining = roundMoney(Math.max(0, target - current));
  const pctComplete = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const monthsCovered = monthlyEssential > 0
    ? roundMoney(current / monthlyEssential)
    : 0;

  // Suggested contribution = available spare capacity, capped at remaining
  const suggestedMonthly = remaining > 0 && monthlySpare > 0
    ? roundMoney(Math.min(remaining, monthlySpare))
    : 0;

  const payFreq = primaryCtx?.pay_frequency || 'monthly';
  const cycleMultiplier = FREQ_TO_MONTHLY[payFreq] || 1;
  const suggestedPerCycle = roundMoney(suggestedMonthly / cycleMultiplier);

  let estimatedCompletion = null;
  if (remaining > 0 && suggestedMonthly > 0) {
    const monthsNeeded = Math.ceil(remaining / suggestedMonthly);
    estimatedCompletion = addMonths(startOfMonth(new Date()), monthsNeeded);
  }

  return {
    monthlyEssential,
    target,
    current,
    remaining,
    pctComplete,
    monthsCovered,
    suggestedMonthly,
    suggestedPerCycle,
    estimatedCompletion,
  };
}