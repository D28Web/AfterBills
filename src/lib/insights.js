/**
 * Financial Insights layer.
 *
 * All computations derive from data AfterBills already holds (bills, income
 * streams, savings goals, sinking funds) and the existing forecast engine.
 * Nothing here invents generic advice or arbitrary scores — every figure is
 * a real delta, milestone or observation computed from the user's records.
 *
 * Three concerns:
 *   1. Period comparison — calendar months and pay cycles, with the most
 *      meaningful changes surfaced as plain-English sentences.
 *   2. Milestones — savings, sinking fund, debt and emergency-fund thresholds
 *      the user has actually reached.
 *   3. Insights — concise, factual observations (heaviest/strongest pay
 *      cycle, bill increases, left-after-bills trend, goals falling behind).
 */
import { addMonths, addDays, addWeeks, startOfMonth, startOfDay, differenceInDays, getDaysInMonth, getDay, format } from 'date-fns';
import { getBillAmountForMonth, getEffectiveBillShare, getIncomeStreamAmountForMonth } from './forecast';
import { getBillOccurrencesInWindow, getPayCycles } from './payday';
import {
  getEffectivePrimaryCycleIncome,
  getEffectivePrimaryMonthlyIncome,
  getEffectiveStreamOccurrenceAmount,
} from './income';
import { getSinkingFundMonthlyContribution } from './sinkingFunds';
import { getEmergencyFundStats } from './emergencyFund';
import { getSignificantIncreases } from './contracts';
import { roundMoney, sumMoney, formatMoney } from './money';

const DEBT_CATEGORIES = ['loans', 'credit_cards'];
const AVG_DAYS_PER_MONTH = 30.44;

/* ------------------------------------------------------------------ *
 * Payday helpers (local, so historical months resolve correctly — the
 * forecast engine anchors pay cycles to "today", which is wrong for a
 * past month comparison).
 * ------------------------------------------------------------------ */

function lastWorkingDayOfMonth(year, month) {
  const lastDay = getDaysInMonth(new Date(year, month));
  let d = new Date(year, month, lastDay);
  while (getDay(d) === 0 || getDay(d) === 6) d = addDays(d, -1);
  return startOfDay(d);
}

function stepBack(date, freq) {
  switch (freq) {
    case 'weekly': return addWeeks(date, -1);
    case 'fortnightly': return addWeeks(date, -2);
    case 'four_weekly': return addWeeks(date, -4);
    case 'quarterly': return addMonths(date, -3);
    case 'annually': return addMonths(date, -12);
    default: return addMonths(date, -1);
  }
}

/** All primary-stream payday dates that fall within a given calendar month. */
function getPaydaysInMonth(ctx, month, year) {
  const freq = ctx?.pay_frequency || 'monthly';
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = startOfMonth(addMonths(monthStart, 1));
  const endBound = ctx?.end_date ? startOfDay(new Date(ctx.end_date)) : null;

  if (freq === 'irregular') return [];

  if (freq === 'monthly') {
    let payday;
    if (ctx?.pay_weekday === 'last_working_day') {
      payday = lastWorkingDayOfMonth(year, month);
    } else {
      const payDay = Math.min(parseInt(ctx?.pay_day) || 1, 28);
      payday = startOfDay(new Date(year, month, payDay));
    }
    if (ctx?.pay_start_date) {
      const start = startOfDay(new Date(ctx.pay_start_date));
      if (payday < start) return [];
    }
    if (endBound && payday > endBound) return [];
    return payday >= monthStart && payday < monthEnd ? [payday] : [];
  }

  if (!ctx?.pay_start_date) return [];
  let cur = startOfDay(new Date(ctx.pay_start_date));
  const step = (d) => {
    if (freq === 'weekly') return addWeeks(d, 1);
    if (freq === 'fortnightly') return addWeeks(d, 2);
    if (freq === 'four_weekly') return addWeeks(d, 4);
    return addMonths(d, 1);
  };
  if (cur >= monthEnd) return [];
  while (cur < monthStart) cur = step(cur);
  const dates = [];
  while (cur < monthEnd) {
    if (endBound && cur > endBound) break;
    dates.push(new Date(cur));
    cur = step(cur);
  }
  return dates;
}

/* ------------------------------------------------------------------ *
 * 1. Period comparison
 * ------------------------------------------------------------------ */

/** The six comparison metrics for a single calendar month. */
export function computeMonthMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, month, year) {
  let regularBills = 0;
  let debt = 0;
  bills.forEach(bill => {
    const amt = getBillAmountForMonth(bill, month, year);
    if (amt <= 0) return;
    if (DEBT_CATEGORIES.includes(bill.category)) debt += amt;
    else regularBills += amt;
  });
  regularBills = roundMoney(regularBills);
  debt = roundMoney(debt);
  const totalBills = roundMoney(regularBills + debt);

  const freq = primaryCtx?.pay_frequency || 'monthly';
  const isIrregularPrimary = freq === 'irregular';
  let baseIncome = 0;
  if (isIrregularPrimary) {
    baseIncome = sumMoney(incomeStreams.map(s => getIncomeStreamAmountForMonth(s, month, year)));
  } else if (freq !== 'monthly' && monthlyIncome > 0) {
    const paydays = getPaydaysInMonth(primaryCtx, month, year);
    baseIncome = sumMoney(paydays.map(d => getEffectivePrimaryCycleIncome(primaryCtx, d, monthlyIncome)));
  } else {
    baseIncome = getEffectivePrimaryMonthlyIncome(primaryCtx, month, year, monthlyIncome);
  }
  let extraIncome = 0;
  if (!isIrregularPrimary) {
    extraIncome = sumMoney(
      (incomeStreams || []).filter(s => !s.is_primary).map(s => getIncomeStreamAmountForMonth(s, month, year))
    );
  }
  const income = roundMoney(baseIncome + extraIncome);

  let sinkingFundTotal = 0;
  (sinkingFunds || []).forEach(fund => {
    if (fund.status === 'completed') return;
    const fundTarget = fund.target_date ? new Date(fund.target_date) : null;
    if (fundTarget && (fundTarget.getFullYear() < year || (fundTarget.getFullYear() === year && fundTarget.getMonth() < month))) return;
    sinkingFundTotal += getSinkingFundMonthlyContribution(fund);
  });
  sinkingFundTotal = roundMoney(sinkingFundTotal);

  const leftAfterBills = roundMoney(income - totalBills);
  const savings = roundMoney(leftAfterBills - sinkingFundTotal);

  return { income, regularBills, debt, totalBills, sinkingFunds: sinkingFundTotal, leftAfterBills, savings };
}

/** Additional (non-primary) income paid within a pay-cycle window. */
function getAdditionalIncomeInCycle(streams, cycleStart, cycleEnd) {
  let total = 0;
  (streams || []).forEach(stream => {
    if (stream.is_primary) return;
    if (stream.income_mode === 'salary') return;
    if (stream.end_date) {
      const endDate = startOfDay(new Date(stream.end_date));
      if (cycleStart > endDate) return;
    }
    (stream.scheduled_changes || []).forEach(c => {
      if (c.change_type === 'one_off' && c.effective_date) {
        const d = startOfDay(new Date(c.effective_date));
        if (d >= cycleStart && d <= cycleEnd) total += parseFloat(c.amount) || 0;
      }
    });
    if (stream.frequency === 'irregular') {
      if (!stream.next_payment_date) return;
      const d = startOfDay(new Date(stream.next_payment_date));
      if (d >= cycleStart && d <= cycleEnd) total += getEffectiveStreamOccurrenceAmount(stream, d);
      return;
    }
    if (!stream.start_date) return;
    const occs = getBillOccurrencesInWindow(stream, cycleStart, cycleEnd);
    occs.forEach(d => {
      let amt = getEffectiveStreamOccurrenceAmount(stream, d);
      (stream.scheduled_changes || []).forEach(c => {
        if (c.change_type === 'addition' && c.effective_date) {
          const eff = startOfDay(new Date(c.effective_date));
          const end = c.end_date ? startOfDay(new Date(c.end_date)) : null;
          if (d >= eff && (!end || d <= end)) amt += parseFloat(c.amount) || 0;
        }
      });
      total += roundMoney(amt);
    });
  });
  return roundMoney(total);
}

/** The six comparison metrics for a single pay cycle (any date range). */
export function computeCycleMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, cycleStart, cycleEnd) {
  const primaryAmount = roundMoney(getEffectivePrimaryCycleIncome(primaryCtx, cycleStart, monthlyIncome));
  const extraIncome = getAdditionalIncomeInCycle(incomeStreams, cycleStart, cycleEnd);
  const income = roundMoney(primaryAmount + extraIncome);

  let regularBills = 0;
  let debt = 0;
  bills.forEach(bill => {
    const occs = getBillOccurrencesInWindow(bill, cycleStart, cycleEnd);
    occs.forEach(d => {
      const amt = getEffectiveBillShare(bill, d);
      if (DEBT_CATEGORIES.includes(bill.category)) debt += amt;
      else regularBills += amt;
    });
  });
  regularBills = roundMoney(regularBills);
  debt = roundMoney(debt);
  const totalBills = roundMoney(regularBills + debt);

  const cycleDays = Math.max(1, differenceInDays(cycleEnd, cycleStart) + 1);
  let sinkingFundTotal = 0;
  (sinkingFunds || []).forEach(fund => {
    if (fund.status === 'completed') return;
    const mc = getSinkingFundMonthlyContribution(fund);
    if (mc > 0) sinkingFundTotal += (mc * cycleDays) / AVG_DAYS_PER_MONTH;
  });
  sinkingFundTotal = roundMoney(sinkingFundTotal);

  const leftAfterBills = roundMoney(income - totalBills);
  const savings = roundMoney(leftAfterBills - sinkingFundTotal);
  return { income, regularBills, debt, totalBills, sinkingFunds: sinkingFundTotal, leftAfterBills, savings };
}

/** Whether any historical data exists for a month (bills started, or amount changes recorded, by then). */
function hasHistoricalDataForMonth(bills, incomeStreams, date) {
  const monthEnd = startOfMonth(addMonths(date, 1));
  const hasBillHistory = bills.some(b => {
    if (b.start_date && new Date(b.start_date) <= monthEnd) return true;
    return (b.amount_history || []).some(e => e.effective_date && new Date(e.effective_date) <= monthEnd);
  });
  const hasIncomeHistory = incomeStreams.some(s => s.start_date && new Date(s.start_date) <= monthEnd);
  return hasBillHistory || hasIncomeHistory;
}

const METRIC_DEFS = [
  { key: 'income', label: 'Income', higherIsBetter: true, phrase: (v, c) => `Your income is ${c} ${v} than` },
  { key: 'regularBills', label: 'Bills', higherIsBetter: false, phrase: (v, c) => `Your bills are ${c} ${v} than` },
  { key: 'debt', label: 'Debt repayments', higherIsBetter: false, phrase: (v, c) => `Your debt repayments are ${c} ${v} than` },
  { key: 'sinkingFunds', label: 'Sinking fund allocations', higherIsBetter: false, phrase: (v, c) => `Your sinking fund allocations are ${c} ${v} than` },
  { key: 'leftAfterBills', label: 'Left after bills', higherIsBetter: true, phrase: (v, c) => `You have ${v} left after bills ${c} than` },
  { key: 'savings', label: 'Left for savings', higherIsBetter: true, phrase: (v, c) => `You have ${v} left for savings ${c} than` },
];

/** Build plain-English highlight sentences for the meaningful deltas, ranked by size. */
function buildHighlights(current, compared, againstLabel, currency) {
  const out = [];
  METRIC_DEFS.forEach(m => {
    const delta = roundMoney(current[m.key] - compared[m.key]);
    if (Math.abs(delta) < 1) return;
    const dir = delta > 0 ? 'higher' : 'lower';
    const moreLess = delta > 0 ? 'more' : 'less';
    const absStr = formatMoney(Math.abs(delta), { currency, decimals: 0 });
    const sentence = `${m.phrase(moreLess, dir)} ${againstLabel}.`;
    out.push({
      key: m.key,
      label: m.label,
      delta,
      sentence,
      direction: delta > 0 ? 'up' : 'down',
      good: m.higherIsBetter ? delta > 0 : delta < 0,
    });
  });
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Compute all four period comparisons.
 * Returns { current, previous, next, lastYear, hasHistory, cycle } where each
 * is either metrics + highlights, or null when unavailable.
 */
export function getPeriodComparisons({ bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, currency = '£' }) {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prev = addMonths(now, -1);
  const next = addMonths(now, 1);
  const lastYear = addMonths(now, -12);

  const current = computeMonthMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, curMonth, curYear);
  const previous = computeMonthMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, prev.getMonth(), prev.getFullYear());
  const nextM = computeMonthMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, next.getMonth(), next.getFullYear());

  const hasHistory = hasHistoricalDataForMonth(bills, incomeStreams, lastYear);
  const lastYearM = hasHistory
    ? computeMonthMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, lastYear.getMonth(), lastYear.getFullYear())
    : null;

  // Pay-cycle comparison (current cycle vs the cycle before it).
  let cycle = null;
  const freq = primaryCtx?.pay_frequency || 'monthly';
  if (freq !== 'irregular' && (primaryCtx?.monthly_income || 0) > 0) {
    const cur = getPayCycles(primaryCtx, 1)[0];
    if (cur) {
      const prevStart = stepBack(cur.start, freq);
      const prevEnd = addDays(cur.start, -1);
      if (prevStart <= prevEnd) {
        const curMetrics = computeCycleMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, cur.start, cur.end);
        const prevMetrics = computeCycleMetrics(bills, incomeStreams, sinkingFunds, primaryCtx, monthlyIncome, prevStart, prevEnd);
        cycle = {
          current: curMetrics,
          previous: prevMetrics,
          highlights: buildHighlights(curMetrics, prevMetrics, 'last pay cycle', currency),
          currentLabel: 'This pay cycle',
          comparedLabel: 'Last pay cycle',
        };
      }
    }
  }

  return {
    current,
    previous: {
      current,
      metrics: previous,
      highlights: buildHighlights(current, previous, 'last month', currency),
      currentLabel: 'This month',
      comparedLabel: 'Last month',
    },
    next: {
      current,
      metrics: nextM,
      highlights: buildHighlights(current, nextM, 'next month', currency),
      currentLabel: 'This month',
      comparedLabel: 'Next month',
    },
    lastYear: lastYearM
      ? {
          current,
          metrics: lastYearM,
          highlights: buildHighlights(current, lastYearM, 'this month last year', currency),
          currentLabel: 'This month',
          comparedLabel: 'Same month last year',
        }
      : null,
    hasHistory,
    cycle: cycle
      ? {
          current: cycle.current,
          metrics: cycle.previous,
          highlights: cycle.highlights,
          currentLabel: cycle.currentLabel,
          comparedLabel: cycle.comparedLabel,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ *
 * 2. Milestones
 * ------------------------------------------------------------------ */

const SAVINGS_THRESHOLDS = [25, 50, 75, 100];
const DEBT_THRESHOLDS = [25, 50, 75, 100];
const EMERGENCY_MONTH_THRESHOLDS = [1, 3, 6];

function highestThresholdReached(pct, thresholds) {
  let reached = null;
  for (const t of thresholds) {
    if (pct >= t) reached = t;
  }
  return reached;
}

/**
 * Recognise milestones the user has currently reached across savings goals,
 * sinking funds, debt and emergency fund. Returns a flat array of
 * { type, label, tone }.
 */
export function getMilestones({ goals = [], sinkingFunds = [], bills = [], emergencyGoal = null, primaryCtx = null, monthlySpare = 0, currency = '£' }) {
  const milestones = [];

  // Savings goals (excluding the emergency fund, which has its own milestones)
  (goals || []).forEach(goal => {
    if (goal.is_emergency_fund) return;
    const target = Math.max(0, parseFloat(goal.target_amount) || 0);
    const current = Math.max(0, parseFloat(goal.current_amount) || 0);
    if (target <= 0) return;
    const pct = Math.min(100, (current / target) * 100);
    const reached = highestThresholdReached(pct, SAVINGS_THRESHOLDS);
    if (reached == null) return;
    if (reached === 100) {
      milestones.push({ type: 'savings', tone: 'good', label: `“${goal.name}” savings goal completed` });
    } else {
      milestones.push({ type: 'savings', tone: 'neutral', label: `“${goal.name}” reached ${reached}%` });
    }
  });

  // Sinking funds fully funded
  (sinkingFunds || []).forEach(fund => {
    const target = Math.max(0, parseFloat(fund.target_amount) || 0);
    const current = Math.max(0, parseFloat(fund.current_amount) || 0);
    if (target > 0 && current >= target) {
      milestones.push({ type: 'sinking', tone: 'good', label: `“${fund.name}” sinking fund fully funded` });
    }
  });

  // Debt repaid milestones
  (bills || []).forEach(bill => {
    if (!DEBT_CATEGORIES.includes(bill.category)) return;
    const remaining = Math.max(0, parseFloat(bill.remaining_balance) || 0);
    const original = parseFloat(bill.original_balance) || 0;
    if (original > 0) {
      const pctRepaid = Math.min(100, Math.max(0, ((original - remaining) / original) * 100));
      const reached = highestThresholdReached(pctRepaid, DEBT_THRESHOLDS);
      if (reached === 100) {
        milestones.push({ type: 'debt', tone: 'good', label: `“${bill.name}” debt cleared` });
      } else if (reached != null) {
        milestones.push({ type: 'debt', tone: 'neutral', label: `“${bill.name}” ${reached}% repaid` });
      }
    } else if (remaining <= 0) {
      // No original recorded — can still recognise cleared when balance hits zero.
      milestones.push({ type: 'debt', tone: 'good', label: `“${bill.name}” debt cleared` });
    }
  });

  // Emergency fund months-covered milestones
  if (emergencyGoal) {
    const stats = getEmergencyFundStats(emergencyGoal, bills, monthlySpare, primaryCtx);
    if (stats.monthlyEssential > 0 && stats.monthsCovered >= 1) {
      const reached = highestThresholdReached(stats.monthsCovered, EMERGENCY_MONTH_THRESHOLDS);
      if (reached != null) {
        milestones.push({
          type: 'emergency',
          tone: reached >= 6 ? 'good' : 'neutral',
          label: `Emergency fund covers ${reached} month${reached === 1 ? '' : 's'} of essential expenses`,
        });
      }
    }
  }

  return milestones;
}

/* ------------------------------------------------------------------ *
 * 3. Insights
 * ------------------------------------------------------------------ */

/**
 * Concise, factual observations derived from forecast + planner data.
 * Returns an array of { tone, text }.
 */
export function getInsights({ plannerData = [], forecast = [], bills = [], goals = [], monthlySpare = 0, currency = '£' }) {
  const insights = [];

  // Most expensive upcoming pay cycle (by total committed)
  const upcoming = (plannerData || []).slice(1); // exclude the current cycle
  if (upcoming.length > 0) {
    const heaviest = upcoming.reduce((max, c) => (c.totalCommitted > max.totalCommitted ? c : max), upcoming[0]);
    if (heaviest.totalCommitted > 0) {
      const label = heaviest.index === 1 ? 'next pay cycle' : `your ${format(heaviest.cycle.start, 'd MMM')} pay cycle`;
      insights.push({
        tone: 'warn',
        text: `Your most expensive pay cycle is ${label}, with ${formatMoney(heaviest.totalCommitted, { currency, decimals: 0 })} in commitments.`,
      });
    }
    // Strongest upcoming pay cycle (most left after commitments)
    const strongest = upcoming.reduce((max, c) => (c.amountLeft > max.amountLeft ? c : max), upcoming[0]);
    if (strongest.amountLeft > 0) {
      const label = strongest.index === 1 ? 'next pay cycle' : `your ${format(strongest.cycle.start, 'd MMM')} pay cycle`;
      insights.push({
        tone: 'good',
        text: `Your strongest pay cycle is ${label}, leaving ${formatMoney(strongest.amountLeft, { currency, decimals: 0 })} after commitments.`,
      });
    }
  }

  // Significant bill increases (from amount_history)
  const increases = getSignificantIncreases(bills, 10, 90);
  if (increases.length > 0) {
    const { bill, entry } = increases[0];
    insights.push({
      tone: 'warn',
      text: `“${bill.name}” increased by ${Math.round(entry.percentage_change)}% to ${formatMoney(entry.new_amount, { currency, decimals: 0 })} on ${format(new Date(entry.effective_date), 'd MMM yyyy')}.`,
    });
  }

  // Improving / declining left-after-bills trend over the next 3 months
  if (forecast.length >= 3) {
    const r = forecast.slice(0, 3).map(m => m.remaining);
    const trend = r[2] - r[0];
    if (Math.abs(trend) >= 5) {
      const dir = trend > 0 ? 'improving' : 'declining';
      insights.push({
        tone: trend > 0 ? 'good' : 'warn',
        text: `Your left-after-bills is ${dir} by ${formatMoney(Math.abs(trend), { currency, decimals: 0 })} over the next 3 months.`,
      });
    }
  }

  // Savings goals falling behind (remaining to save but no spare capacity)
  const behindGoals = (goals || []).filter(g => {
    if (g.is_emergency_fund) return false;
    const target = parseFloat(g.target_amount) || 0;
    const current = parseFloat(g.current_amount) || 0;
    return target > 0 && current < target;
  });
  if (behindGoals.length > 0 && monthlySpare <= 0) {
    const names = behindGoals.slice(0, 2).map(g => `“${g.name}”`).join(' and ');
    insights.push({
      tone: 'warn',
      text: `${names} ${behindGoals.length === 1 ? 'is' : 'are'} falling behind — you have no spare left to save this month.`,
    });
  }

  return insights;
}