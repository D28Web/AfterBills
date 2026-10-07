/**
 * Annual vs Monthly Payment comparison and transition logic.
 *
 * One shared source of truth for comparing monthly vs annual bill payment,
 * calculating the progress of annual-payment funds, checking affordability,
 * ranking opportunities, and generating proactive suggestions.
 *
 * Key principles:
 *  - Never assume annual is always cheaper — compare actual entered prices.
 *  - Use real renewal dates, not a flat /12, for contribution calculations.
 *  - Avoid double-counting linked savings and bills.
 *  - Keep recommendations educational, not prescriptive.
 */
import { roundMoney, formatMoney } from './money';
import { differenceInCalendarMonths, addMonths, format } from 'date-fns';

/** Derive the current payment method from the bill frequency. */
export function getCurrentPaymentMethod(bill) {
  return bill.frequency === 'annually' ? 'annual' : 'monthly';
}

/**
 * Monthly cost if paid monthly.
 * Uses the explicit `monthly_cost` field when entered; otherwise derives
 * from the current amount and frequency so the comparison works even
 * before the user enters explicit comparison data.
 */
export function getMonthlyCost(bill) {
  if (bill.monthly_cost != null && bill.monthly_cost > 0) return roundMoney(bill.monthly_cost);
  const amount = bill.amount || 0;
  switch (bill.frequency) {
    case 'weekly': return roundMoney(amount * 52 / 12);
    case 'fortnightly': return roundMoney(amount * 26 / 12);
    case 'four_weekly': return roundMoney(amount * 13 / 12);
    case 'monthly': return roundMoney(amount);
    case 'quarterly': return roundMoney(amount / 3);
    case 'annually': return roundMoney(amount / 12);
    default: return roundMoney(amount);
  }
}

/**
 * Annual cost if paid annually.
 * Uses the explicit `annual_cost` field when entered; otherwise if the
 * bill is already paid annually the amount IS the annual cost; otherwise
 * derives from the monthly cost (monthly × 12).
 */
export function getAnnualCost(bill) {
  if (bill.annual_cost != null && bill.annual_cost > 0) return roundMoney(bill.annual_cost);
  if (bill.frequency === 'annually') return roundMoney(bill.amount || 0);
  return roundMoney(getMonthlyCost(bill) * 12);
}

/** Total cost over 12 months if paying monthly (monthly × 12). */
export function getMonthlyYearlyCost(bill) {
  return roundMoney(getMonthlyCost(bill) * 12);
}

/**
 * Full annual vs monthly comparison for a single bill.
 * Returns null when there isn't enough data to compare.
 */
export function calculateAnnualComparison(bill) {
  const monthlyCost = getMonthlyCost(bill);
  const annualCost = getAnnualCost(bill);
  const monthlyYearlyCost = roundMoney(monthlyCost * 12);
  const saving = roundMoney(monthlyYearlyCost - annualCost);
  const percentageSaving = monthlyYearlyCost > 0
    ? roundMoney((saving / monthlyYearlyCost) * 100)
    : 0;
  const effectiveMonthlyCost = roundMoney(annualCost / 12);
  const annualCheaper = saving > 0;

  return {
    monthlyCost,
    annualCost,
    monthlyYearlyCost,
    saving,
    percentageSaving,
    effectiveMonthlyCost,
    annualCheaper,
    hasData: monthlyCost > 0 && annualCost > 0,
  };
}

/** Whether a bill is eligible for the annual vs monthly comparison. */
export function isEligibleForAnnualComparison(bill) {
  if (bill.offers_both_options !== true) return false;
  return getMonthlyCost(bill) > 0 && getAnnualCost(bill) > 0;
}

/**
 * The annual renewal / payment date.
 * Uses the explicit `renewal_date` when set; otherwise computes the next
 * annual occurrence from `start_date` when the bill is annual.
 */
export function getAnnualRenewalDate(bill) {
  if (bill.renewal_date) return new Date(bill.renewal_date);
  if (bill.start_date && bill.frequency === 'annually') {
    const start = new Date(bill.start_date);
    const today = new Date();
    let next = new Date(start);
    while (next < today) {
      next = addMonths(next, 12);
    }
    return next;
  }
  return null;
}

/** Whole months from today until the annual renewal date (min 0). */
export function getMonthsUntilRenewal(bill) {
  const renewalDate = getAnnualRenewalDate(bill);
  if (!renewalDate) return null;
  const today = new Date();
  const months = differenceInCalendarMonths(renewalDate, today);
  return Math.max(0, months);
}

/**
 * Progress of a linked annual-payment fund.
 * Uses the ACTUAL number of months until renewal — not a flat /12 — so the
 * required monthly contribution reflects how much time is really left.
 */
export function calculateAnnualFundProgress(bill, goal) {
  if (!goal) return null;
  const annualCost = getAnnualCost(bill);
  const currentAmount = parseFloat(goal.current_amount) || 0;
  const remaining = roundMoney(Math.max(0, annualCost - currentAmount));
  const monthsUntil = getMonthsUntilRenewal(bill);
  const effectiveMonths = monthsUntil != null ? Math.max(1, monthsUntil) : 12;
  const requiredMonthly = roundMoney(remaining / effectiveMonths);
  const isFullyFunded = remaining <= 0;
  const progress = annualCost > 0 ? Math.min(100, (currentAmount / annualCost) * 100) : 0;
  const renewalDate = getAnnualRenewalDate(bill);

  return {
    annualCost,
    currentAmount,
    remaining,
    renewalDate,
    monthsUntil,
    effectiveMonths,
    requiredMonthly,
    isFullyFunded,
    progress,
  };
}

/**
 * Affordability check: can the user realistically fund the annual payment
 * given their current spare cash? Returns a ratio and a recommendation.
 */
export function checkAffordability(requiredMonthly, monthlySpare) {
  if (requiredMonthly <= 0) return { affordable: true, ratio: 0, percentage: 0 };
  if (monthlySpare <= 0) return { affordable: false, ratio: Infinity, percentage: Infinity };
  const ratio = requiredMonthly / monthlySpare;
  return {
    affordable: ratio <= 0.5,
    ratio,
    percentage: roundMoney(ratio * 100),
  };
}

/**
 * All annual-payment opportunities: bills where both costs are known,
 * annual is cheaper, and the user currently pays monthly.
 * Ranked by cash saving by default.
 */
export function getAnnualPaymentOpportunities(bills, goals, monthlySpare) {
  return (bills || [])
    .filter(b => isEligibleForAnnualComparison(b) && getCurrentPaymentMethod(b) === 'monthly')
    .map(b => {
      const comp = calculateAnnualComparison(b);
      if (!comp.annualCheaper) return null;
      const goal = (goals || []).find(g => g.id === b.annual_fund_goal_id);
      const fundProgress = goal ? calculateAnnualFundProgress(b, goal) : null;
      const monthsUntil = getMonthsUntilRenewal(b);
      const effectiveMonths = monthsUntil != null ? Math.max(1, monthsUntil) : 12;
      const requiredMonthly = fundProgress
        ? fundProgress.requiredMonthly
        : roundMoney(comp.annualCost / effectiveMonths);
      const affordability = checkAffordability(requiredMonthly, monthlySpare);
      return {
        bill: b,
        comparison: comp,
        fundProgress,
        goal,
        monthsUntil,
        requiredMonthly,
        affordability,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.comparison.saving - a.comparison.saving);
}

/** Total potential annual savings across all eligible bills. */
export function getTotalPotentialSavings(bills) {
  return (bills || [])
    .filter(b => isEligibleForAnnualComparison(b) && getCurrentPaymentMethod(b) === 'monthly')
    .reduce((sum, b) => {
      const comp = calculateAnnualComparison(b);
      return roundMoney(sum + (comp.annualCheaper ? comp.saving : 0));
    }, 0);
}

/** Count of bills with a meaningful annual saving available. */
export function getOpportunityCount(bills) {
  return (bills || []).filter(b => {
    if (!isEligibleForAnnualComparison(b) || getCurrentPaymentMethod(b) !== 'monthly') return false;
    return calculateAnnualComparison(b).annualCheaper;
  }).length;
}

/**
 * Scenario modelling for a single bill.
 * Tests different contribution levels, switch timings, and existing balances.
 */
export function modelAnnualPaymentScenario(bill, options = {}) {
  const {
    monthlyContribution = 0,
    existingBalance = 0,
    switchTiming = 'next_renewal',
    useExistingSavings = 0,
  } = options;

  const comp = calculateAnnualComparison(bill);
  const annualCost = comp.annualCost;
  const monthsUntil = getMonthsUntilRenewal(bill) ?? 12;
  const effectiveMonths = switchTiming === 'following_year' ? monthsUntil + 12 : monthsUntil;

  const startingBalance = roundMoney(existingBalance + useExistingSavings);
  const remaining = roundMoney(Math.max(0, annualCost - startingBalance));
  const monthsToFund = monthlyContribution > 0
    ? Math.ceil(remaining / monthlyContribution)
    : Infinity;
  const fundedDate = !isFinite(monthsToFund)
    ? null
    : addMonths(new Date(), monthsToFund);

  const canFundBeforeRenewal = isFinite(monthsToFund) && monthsToFund <= effectiveMonths;
  const annualSaving = comp.annualCheaper ? comp.saving : 0;

  return {
    annualCost,
    monthlyContribution,
    startingBalance,
    remaining,
    monthsToFund,
    fundedDate,
    canFundBeforeRenewal,
    annualSaving,
    saving2yr: roundMoney(annualSaving * 2),
    saving3yr: roundMoney(annualSaving * 3),
    saving5yr: roundMoney(annualSaving * 5),
    effectiveMonths,
    monthsUntil,
  };
}

/** Rolling fund: monthly contribution to keep the annual fund topped up after switching. */
export function getRollingFundContribution(bill) {
  return roundMoney(getAnnualCost(bill) / 12);
}

/**
 * Proactive suggestions for the alerts engine.
 * Each suggestion has a stable key so dismissals persist.
 */
export function generateAnnualPaymentSuggestions(bills, goals, monthlySpare, currency) {
  const suggestions = [];
  const opportunities = getAnnualPaymentOpportunities(bills, goals, monthlySpare);

  opportunities.forEach(({ bill, comparison, fundProgress, monthsUntil, requiredMonthly, affordability }) => {
    // Suggestion: annual saving available, no fund yet
    if (!fundProgress) {
      if (affordability.affordable) {
        suggestions.push({
          key: `annual_saving:${bill.id}`,
          type: 'annual_saving',
          priority: 'information',
          title: `Paying "${bill.name}" annually could save ${formatMoney(comparison.saving, { currency, decimals: 0 })}/year`,
          message: monthsUntil != null
            ? `You have ${monthsUntil} months until renewal. Saving ${formatMoney(requiredMonthly, { currency, decimals: 0 })}/month would allow you to pay annually next time.`
            : `Saving ${formatMoney(requiredMonthly, { currency, decimals: 0 })}/month would allow you to pay annually next time.`,
          date: new Date(),
          actionUrl: '/annual-payments',
          dismissible: true,
        });
      } else {
        suggestions.push({
          key: `annual_saving:${bill.id}`,
          type: 'annual_saving',
          priority: 'information',
          title: `Paying "${bill.name}" annually could save ${formatMoney(comparison.saving, { currency, decimals: 0 })}/year`,
          message: `Funding the full amount before renewal would require ${formatMoney(requiredMonthly, { currency, decimals: 0 })}/month. You may prefer to build towards switching the following year.`,
          date: new Date(),
          actionUrl: '/annual-payments',
          dismissible: true,
        });
      }
    }

    // Suggestion: enough saved to switch
    if (fundProgress?.isFullyFunded) {
      suggestions.push({
        key: `annual_ready:${bill.id}`,
        type: 'annual_ready',
        priority: 'information',
        title: `You can switch "${bill.name}" to annual payment`,
        message: `Your annual-payment fund has enough set aside to pay annually at your next renewal.`,
        date: new Date(),
        actionUrl: '/annual-payments',
        dismissible: true,
      });
    }

    // Suggestion: behind target
    if (fundProgress && !fundProgress.isFullyFunded && fundProgress.requiredMonthly > monthlySpare && monthlySpare > 0) {
      const shortfall = roundMoney(fundProgress.requiredMonthly - monthlySpare);
      suggestions.push({
        key: `annual_behind:${bill.id}`,
        type: 'annual_behind',
        priority: 'attention',
        title: `"${bill.name}" annual fund is behind target`,
        message: `Your annual-payment fund is ${formatMoney(fundProgress.remaining, { currency, decimals: 0 })} short. Adding ${formatMoney(shortfall, { currency, decimals: 0 })}/month would get it back on track.`,
        date: new Date(),
        actionUrl: '/annual-payments',
        dismissible: false,
      });
    }
  });

  return suggestions;
}