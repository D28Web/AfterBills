/**
 * Sinking Fund calculations.
 *
 * Sinking funds help users gradually reserve money for known future costs
 * (car insurance, MOT, Christmas, holidays, etc.). All amounts are
 * user-entered planning data — nothing here connects to bank accounts.
 */
import { addMonths, startOfMonth, startOfDay, isAfter, isBefore } from 'date-fns';
import { roundMoney } from './money';
import { FREQ_TO_MONTHLY } from './income';

/**
 * Compute all derived stats for a single sinking fund.
 *
 * @param {object} fund  - SinkingFund entity record
 * @param {object} [user] - Income context with pay_frequency (from getPrimaryIncomeContext)
 * @returns {object} { remaining, pctFunded, monthlyContribution, perCycleContribution,
 *                     projectedDate, monthsUntilTarget, trackingStatus }
 */
export function getSinkingFundStats(fund, user = null) {
  const target = Math.max(0, parseFloat(fund.target_amount) || 0);
  const current = Math.max(0, parseFloat(fund.current_amount) || 0);
  const remaining = roundMoney(Math.max(0, target - current));
  const pctFunded = target > 0
    ? Math.min(100, (current / target) * 100)
    : (current > 0 ? 100 : 0);

  const now = startOfMonth(new Date());
  const targetDate = fund.target_date ? startOfDay(new Date(fund.target_date)) : null;

  // Months from the current month to the target month (inclusive of target month)
  const monthsUntilTarget = targetDate
    ? Math.max(0, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()))
    : 0;

  // Monthly contribution required to fully fund by the target date
  const monthlyContribution = remaining > 0
    ? (monthsUntilTarget > 0 ? roundMoney(remaining / monthsUntilTarget) : remaining)
    : 0;

  // Contribution per pay cycle, based on the user's pay frequency
  const payFreq = user?.pay_frequency || 'monthly';
  const cycleMultiplier = FREQ_TO_MONTHLY[payFreq] || 1;
  const perCycleContribution = roundMoney(monthlyContribution / cycleMultiplier);

  // Projected completion date — when the fund completes if the user
  // contributes the required monthly amount starting now
  let projectedDate = null;
  if (remaining > 0 && monthlyContribution > 0) {
    const monthsNeeded = Math.ceil(remaining / monthlyContribution);
    projectedDate = addMonths(now, monthsNeeded);
  }

  // Tracking status: compare actual savings vs. expected linear progress
  // from the fund's creation date to its target date.
  let trackingStatus = 'on_track';

  if (remaining <= 0) {
    trackingStatus = 'completed';
  } else if (!targetDate) {
    trackingStatus = 'on_track';
  } else {
    const createdDate = fund.created_date
      ? startOfMonth(new Date(fund.created_date))
      : now;
    const totalMonths = Math.max(
      1,
      (targetDate.getFullYear() - createdDate.getFullYear()) * 12 +
        (targetDate.getMonth() - createdDate.getMonth())
    );
    const monthsElapsed = Math.max(
      0,
      (now.getFullYear() - createdDate.getFullYear()) * 12 +
        (now.getMonth() - createdDate.getMonth())
    );
    const expectedSavings = target * Math.min(1, monthsElapsed / totalMonths);

    if (current >= expectedSavings * 1.15) {
      trackingStatus = 'ahead';
    } else if (current < expectedSavings * 0.85) {
      trackingStatus = 'behind';
    } else {
      trackingStatus = 'on_track';
    }
  }

  return {
    remaining,
    pctFunded,
    monthlyContribution,
    perCycleContribution,
    projectedDate,
    monthsUntilTarget,
    trackingStatus,
  };
}

/**
 * Monthly contribution for a single active sinking fund.
 * Returns 0 for completed funds.
 */
export function getSinkingFundMonthlyContribution(fund) {
  if (fund.status === 'completed') return 0;
  return getSinkingFundStats(fund).monthlyContribution;
}

/**
 * Total monthly contribution across all active sinking funds.
 */
export function getTotalSinkingFundMonthly(sinkingFunds = []) {
  return roundMoney(
    (sinkingFunds || [])
      .filter(f => f.status !== 'completed')
      .reduce((sum, f) => sum + getSinkingFundMonthlyContribution(f), 0)
  );
}

/**
 * Total amount currently set aside across all sinking funds.
 */
export function getTotalSetAside(sinkingFunds = []) {
  return roundMoney(
    (sinkingFunds || []).reduce((sum, f) => sum + (parseFloat(f.current_amount) || 0), 0)
  );
}

/**
 * Total target amount across all sinking funds.
 */
export function getTotalTarget(sinkingFunds = []) {
  return roundMoney(
    (sinkingFunds || []).reduce((sum, f) => sum + (parseFloat(f.target_amount) || 0), 0)
  );
}

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const PRIORITY_STYLES = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-sky-50 text-sky-700 border-sky-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const TRACKING_LABELS = {
  ahead: 'Ahead',
  on_track: 'On Track',
  behind: 'Behind',
  completed: 'Completed',
};

export const TRACKING_STYLES = {
  ahead: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_track: 'bg-primary/10 text-primary border-primary/20',
  behind: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};