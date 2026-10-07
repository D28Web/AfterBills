import { addMonths, addWeeks, getDaysInMonth, startOfDay, startOfMonth, isSameMonth, format, addDays } from 'date-fns';
import { roundMoney, getSplitShare, sumMoney } from './money';
import { FREQ_TO_MONTHLY, getEffectiveStreamOccurrenceAmount, getEffectivePrimaryCycleIncome, getEffectivePrimaryMonthlyIncome } from './income';
import { getSinkingFundMonthlyContribution } from './sinkingFunds';

/**
 * Inline pay cycle stepping — returns array of cycle start dates.
 * Avoids circular import with payday.js.
 */
function computePayCycles(user, count = 16) {
  const freq = user?.pay_frequency || 'monthly';
  const today = startOfDay(new Date());

  let anchor;
  if (user?.pay_start_date) {
    anchor = startOfDay(new Date(user.pay_start_date));
  } else {
    const payDay = Math.min(parseInt(user?.pay_day) || 1, 28);
    anchor = startOfDay(new Date(today.getFullYear(), today.getMonth(), payDay));
  }

  function step(d, forward = true) {
    const n = forward ? 1 : -1;
    switch (freq) {
      case 'weekly':      return addWeeks(d, n);
      case 'fortnightly': return addWeeks(d, n * 2);
      case 'four_weekly': return addWeeks(d, n * 4);
      case 'annually':    return addMonths(d, n * 12);
      default:            return addMonths(d, n);
    }
  }

  // Walk to most recent payday <= today
  if (anchor > today) {
    while (anchor > today) anchor = step(anchor, false);
  } else {
    let next = step(anchor);
    while (next <= today) { anchor = next; next = step(anchor); }
  }

  const starts = [];
  let cur = anchor;
  for (let i = 0; i < count; i++) {
    starts.push(new Date(cur));
    cur = step(cur);
  }
  return starts;
}

/**
 * Counts how many times a weekly or fortnightly event occurs within a specific calendar month.
 * Uses the event's anchor start_date to determine the exact schedule.
 */
function countOccurrencesInMonth(startDateStr, frequency, targetMonth, targetYear) {
  const monthStart = startOfMonth(new Date(targetYear, targetMonth));
  const monthEnd = startOfMonth(addMonths(monthStart, 1));

  let cur = startOfDay(new Date(startDateStr));

  // Walk forward to the first occurrence on or after the month start
  const stepForward = (d) => {
    if (frequency === 'weekly') return addWeeks(d, 1);
    if (frequency === 'fortnightly') return addWeeks(d, 2);
    if (frequency === 'four_weekly') return addWeeks(d, 4);
    return addWeeks(d, 1);
  };

  // If anchor is after the month, no occurrences
  if (cur >= monthEnd) return 0;

  // Walk anchor forward until it reaches or passes the month start
  while (cur < monthStart) cur = stepForward(cur);

  // Count occurrences that fall within the month
  let count = 0;
  while (cur < monthEnd) {
    if (isSameMonth(cur, monthStart)) count++;
    cur = stepForward(cur);
  }
  return count;
}

/**
 * Resolve the active total amount for a bill on a given date, applying any
 * scheduled future changes (rent increase, renewal price, etc.). The base
 * `amount` applies until a change's effective_date; a change with an end_date
 * reverts to the base afterwards. Historical amounts are preserved separately
 * in amount_history and are not consulted here.
 */
export function getEffectiveBillAmount(bill, date) {
  let amount = parseFloat(bill.amount) || 0;
  const changes = (bill.scheduled_changes || [])
    .filter(c => c.effective_date)
    .sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date));
  const target = startOfDay(new Date(date));
  for (const c of changes) {
    const eff = startOfDay(new Date(c.effective_date));
    const end = c.end_date ? startOfDay(new Date(c.end_date)) : null;
    if (target >= eff && (!end || target <= end)) amount = parseFloat(c.amount) || 0;
  }
  return amount;
}

/** A person's share of the effective amount on a given date. */
export function getEffectiveBillShare(bill, date) {
  const amount = getEffectiveBillAmount(bill, date);
  if (bill.is_split && bill.split_between > 1) return amount / bill.split_between;
  return amount;
}

/**
 * Convert a bill to its monthly equivalent cost (current, as of today).
 * Uses today's effective amount so scheduled future changes are not averaged
 * in — date-specific forecasts use getBillAmountForMonth instead.
 */
export function getBillShare(bill) {
  return getSplitShare(bill);
}

export function billToMonthlyCost(bill) {
  const amount = getEffectiveBillShare(bill, new Date());
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

/** Ordinal suffix for a day-of-month number (1st, 2nd, 3rd, 4th...). */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/** "Due 5th"-style label for a bill's due day. */
export function formatDueDay(bill) {
  const day = getBillDueDay(bill);
  return `Due ${day}${ordinal(day)}`;
}

/**
 * Get the anchor month/year for a bill from its start_date (or fallback to due_day).
 */
function getBillAnchor(bill) {
  if (bill.start_date) {
    const d = new Date(bill.start_date);
    return { anchorMonth: d.getMonth(), anchorYear: d.getFullYear(), dueDay: d.getDate() };
  }
  // legacy fallback: treat as always active, use due_day or 1
  const today = new Date();
  return { anchorMonth: 0, anchorYear: today.getFullYear() - 10, dueDay: bill.due_day || 1 };
}

/**
 * Check if a bill is due in a given month/year based on its frequency and start_date.
 */
export function isBillDueInMonth(bill, month, year) {
  const { anchorMonth, anchorYear } = getBillAnchor(bill);

  // Bill hasn't started yet
  if (year < anchorYear || (year === anchorYear && month < anchorMonth)) return false;

  switch (bill.frequency) {
    case 'weekly':
    case 'fortnightly':
    case 'four_weekly':
    case 'monthly':
      return true;
    case 'quarterly': {
      const monthsElapsed = (year - anchorYear) * 12 + (month - anchorMonth);
      return monthsElapsed % 3 === 0;
    }
    case 'annually': {
      const monthsElapsed = (year - anchorYear) * 12 + (month - anchorMonth);
      return monthsElapsed % 12 === 0;
    }
    default:
      return true;
  }
}

/**
 * Get the due day for a bill in a given month.
 */
export function getBillDueDay(bill) {
  return getBillAnchor(bill).dueDay;
}

/**
 * Generate the actual occurrence dates for a bill within a calendar month,
 * respecting its start date, frequency, and optional end date (temporary
 * bills stop after end_date). Used to resolve per-occurrence effective
 * amounts so date-specific changes are never collapsed into a monthly average.
 */
export function getBillOccurrencesInMonth(bill, month, year) {
  const { anchorMonth, anchorYear, dueDay } = getBillAnchor(bill);
  if (year < anchorYear || (year === anchorYear && month < anchorMonth)) return [];
  const endBound = bill.end_date ? startOfDay(new Date(bill.end_date)) : null;
  const monthStart = startOfMonth(new Date(year, month));
  if (endBound && endBound < monthStart) return [];

  const daysInMonth = getDaysInMonth(new Date(year, month));
  const occDay = Math.min(dueDay, daysInMonth);
  const occDate = startOfDay(new Date(year, month, occDay));

  switch (bill.frequency) {
    case 'weekly':
    case 'fortnightly':
    case 'four_weekly': {
      const monthEnd = startOfMonth(addMonths(monthStart, 1));
      if (!bill.start_date) return [];
      let cur = startOfDay(new Date(bill.start_date));
      const step = (d) => {
        if (bill.frequency === 'weekly') return addWeeks(d, 1);
        if (bill.frequency === 'fortnightly') return addWeeks(d, 2);
        return addWeeks(d, 4);
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
    case 'quarterly':
      if (!isBillDueInMonth(bill, month, year)) return [];
      if (endBound && occDate > endBound) return [];
      return [occDate];
    case 'annually':
      if (!isBillDueInMonth(bill, month, year)) return [];
      if (endBound && occDate > endBound) return [];
      return [occDate];
    default:
      if (endBound && occDate > endBound) return [];
      return [occDate];
  }
}

/**
 * Find the next occurrence of a bill on or after `fromDate`, scanning up to
 * 13 months ahead so annual and quarterly bills resolve correctly. Returns
 * a startOfDay Date, or null when no future occurrence exists.
 */
export function getNextBillOccurrence(bill, fromDate = new Date()) {
  const from = startOfDay(fromDate);
  for (let i = 0; i < 13; i++) {
    const d = addMonths(startOfMonth(from), i);
    const occs = getBillOccurrencesInMonth(bill, d.getMonth(), d.getFullYear());
    const next = occs.map(x => startOfDay(x)).filter(x => x >= from).sort((a, b) => a - b)[0];
    if (next) return next;
  }
  return null;
}

/**
 * Get the actual bill amount for a given month, summing the per-occurrence
 * effective amounts (scheduled changes applied per occurrence) and excluding
 * occurrences past an optional end date.
 */
export function getBillAmountForMonth(bill, month, year) {
  const occurrences = getBillOccurrencesInMonth(bill, month, year);
  return roundMoney(sumMoney(occurrences.map(d => getEffectiveBillShare(bill, d))));
}

/**
 * Generate occurrence dates for an income stream within a calendar month,
 * respecting start date, frequency, and optional end date.
 */
function getStreamOccurrencesInMonth(stream, month, year) {
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = startOfMonth(addMonths(monthStart, 1));
  const endBound = stream.end_date ? startOfDay(new Date(stream.end_date)) : null;
  let cur;
  if (stream.start_date) {
    cur = startOfDay(new Date(stream.start_date));
  } else {
    // Legacy fallback for monthly/quarterly/annual streams without a start
    // date: treat as always started, anchored on the 1st far in the past.
    // Weekly/fortnightly need a real anchor to place occurrences.
    if (['weekly', 'fortnightly', 'four_weekly'].includes(stream.frequency)) return [];
    cur = startOfDay(new Date(new Date().getFullYear() - 10, 0, 1));
  }
  const step = (d) => {
    switch (stream.frequency) {
      case 'weekly': return addWeeks(d, 1);
      case 'fortnightly': return addWeeks(d, 2);
      case 'four_weekly': return addWeeks(d, 4);
      case 'quarterly': return addMonths(d, 3);
      case 'annually': return addMonths(d, 12);
      default: return addMonths(d, 1);
    }
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

/**
 * Calculate monthly income for an income stream, applying scheduled changes
 * (amount changes, one-off payments, additions) and variable per-period
 * amounts per occurrence — never as a flat monthly average.
 */
export function getIncomeStreamAmountForMonth(stream, month, year) {
  if (stream.end_date) {
    const endDate = new Date(stream.end_date);
    if (year > endDate.getFullYear() || (year === endDate.getFullYear() && month > endDate.getMonth())) return 0;
  }

  const addOneOffsAndAdditions = (occurrences, base) => {
    let total = base;
    (stream.scheduled_changes || []).forEach(c => {
      if (c.change_type === 'one_off' && c.effective_date) {
        const d = new Date(c.effective_date);
        if (d.getMonth() === month && d.getFullYear() === year) total += parseFloat(c.amount) || 0;
      }
      if (c.change_type === 'addition' && c.effective_date) {
        const eff = startOfDay(new Date(c.effective_date));
        const end = c.end_date ? startOfDay(new Date(c.end_date)) : null;
        const inRange = occurrences.filter(d => d >= eff && (!end || d <= end));
        total += roundMoney(inRange.length * (parseFloat(c.amount) || 0));
      }
    });
    return roundMoney(total);
  };

  if (stream.frequency === 'irregular') {
    let total = 0;
    if (stream.next_payment_date) {
      const d = new Date(stream.next_payment_date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        total += getEffectiveStreamOccurrenceAmount(stream, d);
      }
    }
    return addOneOffsAndAdditions([], total);
  }

  const occurrences = getStreamOccurrencesInMonth(stream, month, year);
  const base = sumMoney(occurrences.map(d => getEffectiveStreamOccurrenceAmount(stream, d)));
  return addOneOffsAndAdditions(occurrences, base);
}

/**
 * Generate a 12-month forecast.
 * When user has a non-monthly pay frequency, income per month is calculated by
 * counting actual paydays that fall in each calendar month.
 */
export function generateForecast(bills, monthlyIncome, startDate = new Date(), incomeStreams = [], user = null, sinkingFunds = []) {
  const start = startOfMonth(startDate);
  const months = [];

  // Pre-compute payday-aware income per month if user has non-monthly pay
  // frequency. Each payday resolves its own effective cycle income so
  // scheduled pay rises / variable amounts apply on the correct date.
  let paydayIncomeByMonth = null;
  if (user?.pay_frequency && user.pay_frequency !== 'monthly' && monthlyIncome > 0) {
    const multiplier = FREQ_TO_MONTHLY[user.pay_frequency];
    if (multiplier) {
      const payCycles = computePayCycles(user, 16);
      paydayIncomeByMonth = {};
      payCycles.forEach(cycleStart => {
        const cycleIncome = getEffectivePrimaryCycleIncome(user, cycleStart, monthlyIncome);
        const key = `${cycleStart.getFullYear()}-${cycleStart.getMonth()}`;
        paydayIncomeByMonth[key] = (paydayIncomeByMonth[key] || 0) + cycleIncome;
      });
    }
  }

  for (let i = 0; i < 12; i++) {
    const date = addMonths(start, i);
    const month = date.getMonth();
    const year = date.getFullYear();
    const label = format(date, 'MMM yyyy');
    const shortLabel = format(date, 'MMM');

    let totalBills = 0;
    const billsThisMonth = [];

    bills.forEach(bill => {
      const amount = getBillAmountForMonth(bill, month, year);
      if (amount > 0) {
        totalBills += amount;
        billsThisMonth.push({ ...bill, monthAmount: amount });
      }
    });

    // Additional income streams on top of base monthly income
    let extraIncome = 0;
    incomeStreams.forEach(stream => {
      extraIncome += getIncomeStreamAmountForMonth(stream, month, year);
    });

    // Use payday-accurate income if available, otherwise the effective monthly
    // income for this month (scheduled changes resolved by month start).
    const baseIncome = paydayIncomeByMonth
      ? (paydayIncomeByMonth[`${year}-${month}`] || 0)
      : getEffectivePrimaryMonthlyIncome(user, month, year, monthlyIncome);

    const totalIncome = baseIncome + extraIncome;

    // Planned sinking fund contributions for this month
    let sinkingFundTotal = 0;
    if (sinkingFunds && sinkingFunds.length > 0) {
      sinkingFunds.forEach(fund => {
        if (fund.status === 'completed') return;
        const fundTarget = fund.target_date ? new Date(fund.target_date) : null;
        if (fundTarget && (fundTarget.getFullYear() < year || (fundTarget.getFullYear() === year && fundTarget.getMonth() < month))) return;
        sinkingFundTotal += getSinkingFundMonthlyContribution(fund);
      });
    }
    sinkingFundTotal = roundMoney(sinkingFundTotal);

    const remaining = totalIncome - totalBills - sinkingFundTotal;

    months.push({
      date,
      month,
      year,
      label,
      shortLabel,
      income: roundMoney(totalIncome),
      totalBills: roundMoney(totalBills),
      sinkingFunds: sinkingFundTotal,
      remaining: roundMoney(remaining),
      bills: billsThisMonth,
    });
  }

  return months;
}

/**
 * Get upcoming bills sorted by date.
 */
export function getUpcomingBills(bills, count = 5) {
  const today = new Date();
  const currentDay = today.getDate();

  const sorted = [...bills].sort((a, b) => {
    const aDue = getBillDueDay(a);
    const bDue = getBillDueDay(b);
    const aDays = aDue >= currentDay ? aDue - currentDay : aDue + 30 - currentDay;
    const bDays = bDue >= currentDay ? bDue - currentDay : bDue + 30 - currentDay;
    return aDays - bDays;
  });

  return sorted.slice(0, count);
}

/**
 * Get bills for a specific day in a month, using start_date + frequency to generate occurrences.
 */
export function getBillsForDay(bills, day, month, year) {
  const targetDate = new Date(year, month, day);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return bills.filter(bill => {
    if (!bill.start_date) {
      // legacy fallback: use due_day
      const dueDay = Math.min(bill.due_day || 1, getDaysInMonth(new Date(year, month)));
      return dueDay === day && isBillDueInMonth(bill, month, year);
    }
    let cursor = startOfDay(new Date(bill.start_date));
    const end = startOfDay(monthEnd);
    const MAX_ITER = 2000;
    let iter = 0;
    // Walk forward to month range
    while (cursor < monthStart && iter < MAX_ITER) {
      cursor = stepBillForward(cursor, bill.frequency);
      iter++;
    }
    // Check if any occurrence matches this day
    iter = 0;
    while (cursor <= end && iter < MAX_ITER) {
      if (cursor.getDate() === day && cursor.getMonth() === month && cursor.getFullYear() === year) return true;
      cursor = stepBillForward(cursor, bill.frequency);
      iter++;
    }
    return false;
  });
}

function stepBillForward(date, freq) {
  switch (freq) {
    case 'weekly':      return addWeeks(date, 1);
    case 'fortnightly': return addWeeks(date, 2);
    case 'four_weekly': return addWeeks(date, 4);
    case 'quarterly':   return addMonths(date, 3);
    case 'annually':    return addMonths(date, 12);
    default:            return addMonths(date, 1);
  }
}

/**
 * Calculate category totals.
 */
export function getCategoryTotals(bills) {
  const totals = {};
  bills.forEach(bill => {
    const monthly = billToMonthlyCost(bill);
    totals[bill.category] = (totals[bill.category] || 0) + monthly;
  });
  return Object.entries(totals).map(([category, total]) => ({
    category,
    total: roundMoney(total),
  })).sort((a, b) => b.total - a.total);
}

export const CATEGORY_COLORS = {
  housing: 'hsl(168, 56%, 42%)',
  utilities: 'hsl(210, 70%, 55%)',
  insurance: 'hsl(280, 55%, 55%)',
  transport: 'hsl(35, 90%, 55%)',
  subscriptions: 'hsl(340, 65%, 55%)',
  loans: 'hsl(0, 72%, 58%)',
  credit_cards: 'hsl(25, 85%, 55%)',
  food: 'hsl(130, 50%, 45%)',
  health: 'hsl(200, 60%, 50%)',
  education: 'hsl(260, 50%, 50%)',
  other: 'hsl(220, 10%, 55%)',
};

export const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  four_weekly: 'Four-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  irregular: 'Irregular',
};

export const CATEGORY_LABELS = {
  housing: 'Housing',
  utilities: 'Utilities',
  insurance: 'Insurance',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  loans: 'Loans',
  credit_cards: 'Credit Cards',
  food: 'Food',
  health: 'Health',
  education: 'Education',
  other: 'Other',
};