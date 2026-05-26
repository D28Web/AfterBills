import { addDays, addWeeks, addMonths, startOfDay, isAfter, isBefore, format, getDay, getDaysInMonth } from 'date-fns';

const WEEKDAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

/**
 * Snap a date to the nearest occurrence of a given weekday on or after it.
 */
function snapToWeekday(date, weekday) {
  const target = WEEKDAY_MAP[weekday];
  if (target === undefined) return date;
  const current = getDay(date);
  const diff = (target - current + 7) % 7;
  return addDays(date, diff);
}

/**
 * Get the last working day (Mon–Fri) of a given month/year.
 */
function lastWorkingDayOfMonth(year, month) {
  const lastDay = getDaysInMonth(new Date(year, month));
  let d = new Date(year, month, lastDay);
  while (getDay(d) === 0 || getDay(d) === 6) d = addDays(d, -1);
  return d;
}

function stepForward(date, freq) {
  switch (freq) {
    case 'weekly':      return addWeeks(date, 1);
    case 'fortnightly': return addWeeks(date, 2);
    case 'four_weekly': return addWeeks(date, 4);
    case 'quarterly':   return addMonths(date, 3);
    case 'annually':    return addMonths(date, 12);
    default:            return addMonths(date, 1);
  }
}

function stepBack(date, freq) {
  switch (freq) {
    case 'weekly':      return addWeeks(date, -1);
    case 'fortnightly': return addWeeks(date, -2);
    case 'four_weekly': return addWeeks(date, -4);
    case 'quarterly':   return addMonths(date, -3);
    case 'annually':    return addMonths(date, -12);
    default:            return addMonths(date, -1);
  }
}

/**
 * Get the anchor (first known payday) for this user.
 * For monthly pay this is day-of-month or last working day.
 */
function getAnchorDate(user) {
  const today = startOfDay(new Date());

  if (user?.pay_start_date) {
    return startOfDay(new Date(user.pay_start_date));
  }

  // Monthly fallback: use pay_day or last working day
  if (user?.pay_weekday === 'last_working_day') {
    return lastWorkingDayOfMonth(today.getFullYear(), today.getMonth());
  }

  const payDay = Math.min(parseInt(user?.pay_day) || 1, 28);
  return startOfDay(new Date(today.getFullYear(), today.getMonth(), payDay));
}

/**
 * Generate the next payday after `date` for monthly pay,
 * respecting last_working_day or day-of-month rules.
 */
function nextMonthlyPayday(date, user) {
  const next = addMonths(date, 1);
  if (user?.pay_weekday === 'last_working_day') {
    return lastWorkingDayOfMonth(next.getFullYear(), next.getMonth());
  }
  const payDay = Math.min(parseInt(user?.pay_day) || date.getDate(), 28);
  return startOfDay(new Date(next.getFullYear(), next.getMonth(), payDay));
}

/**
 * Returns `count` pay cycles starting from the most recent payday on or before today.
 * For weekly/fortnightly/four_weekly: uses pay_start_date as anchor, optionally snaps to pay_weekday.
 * For monthly: uses pay_day or last_working_day rule.
 */
export function getPayCycles(user, count = 3) {
  const today = startOfDay(new Date());
  const freq = user?.pay_frequency || 'monthly';
  const weekdayRule = user?.pay_weekday;
  const isMonthly = freq === 'monthly';

  let anchor = getAnchorDate(user);

  if (isMonthly) {
    // Walk to the most recent monthly payday <= today
    // Handle last_working_day
    if (weekdayRule === 'last_working_day') {
      let candidate = lastWorkingDayOfMonth(today.getFullYear(), today.getMonth());
      if (isAfter(candidate, today)) {
        candidate = lastWorkingDayOfMonth(
          today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear(),
          today.getMonth() === 0 ? 11 : today.getMonth() - 1
        );
      }
      anchor = candidate;
    } else {
      const payDay = Math.min(parseInt(user?.pay_day) || 1, 28);
      let candidate = startOfDay(new Date(today.getFullYear(), today.getMonth(), payDay));
      if (isAfter(candidate, today)) {
        const prev = addMonths(candidate, -1);
        candidate = startOfDay(new Date(prev.getFullYear(), prev.getMonth(), payDay));
      }
      anchor = candidate;
    }

    // Build monthly cycles
    const cycles = [];
    let cycleStart = anchor;
    for (let i = 0; i < count; i++) {
      let cycleEnd;
      if (weekdayRule === 'last_working_day') {
        const nextStart = lastWorkingDayOfMonth(
          cycleStart.getMonth() === 11 ? cycleStart.getFullYear() + 1 : cycleStart.getFullYear(),
          cycleStart.getMonth() === 11 ? 0 : cycleStart.getMonth() + 1
        );
        cycleEnd = addDays(nextStart, -1);
        cycles.push({ start: new Date(cycleStart), end: cycleEnd, index: i });
        cycleStart = nextStart;
      } else {
        const nextStart = nextMonthlyPayday(cycleStart, user);
        cycleEnd = addDays(nextStart, -1);
        cycles.push({ start: new Date(cycleStart), end: cycleEnd, index: i });
        cycleStart = nextStart;
      }
    }
    return cycles;
  }

  // Weekly / fortnightly / four_weekly — anchor from pay_start_date
  // Walk to most recent payday <= today
  if (isAfter(anchor, today)) {
    while (isAfter(anchor, today)) anchor = stepBack(anchor, freq);
  } else {
    let next = stepForward(anchor, freq);
    while (!isAfter(next, today)) { anchor = next; next = stepForward(anchor, freq); }
  }

  // If user set a weekday rule, verify anchor is on that weekday
  // (pay_start_date should already be on the right weekday, but snap just in case)
  if (weekdayRule && weekdayRule !== 'none' && weekdayRule !== 'last_working_day') {
    anchor = snapToWeekday(anchor, weekdayRule);
  }

  const cycles = [];
  let cycleStart = anchor;
  for (let i = 0; i < count; i++) {
    let nextStart = stepForward(cycleStart, freq);
    // Snap next start to correct weekday if rule set
    if (weekdayRule && weekdayRule !== 'none' && weekdayRule !== 'last_working_day') {
      nextStart = snapToWeekday(nextStart, weekdayRule);
    }
    const cycleEnd = addDays(nextStart, -1);
    cycles.push({ start: new Date(cycleStart), end: cycleEnd, index: i });
    cycleStart = nextStart;
  }
  return cycles;
}

/**
 * Generate all occurrence dates for a bill from its start_date using its frequency.
 * Returns dates that fall within [windowStart, windowEnd].
 */
export function getBillOccurrencesInWindow(bill, windowStart, windowEnd) {
  const start = startOfDay(new Date(windowStart));
  const end = startOfDay(new Date(windowEnd));

  // Legacy bills without start_date: use due_day to place a single occurrence in the window month
  if (!bill.start_date) {
    const dueDay = bill.due_day || 1;
    // Place occurrence on the due day of the window's start month
    const occurrence = startOfDay(new Date(start.getFullYear(), start.getMonth(), Math.min(dueDay, 28)));
    if (!isBefore(occurrence, start) && !isAfter(occurrence, end)) {
      return [occurrence];
    }
    // Also check next month in case window spans two months
    const occurrence2 = startOfDay(new Date(end.getFullYear(), end.getMonth(), Math.min(dueDay, 28)));
    if (!isBefore(occurrence2, start) && !isAfter(occurrence2, end) && occurrence2.getTime() !== occurrence.getTime()) {
      return [occurrence2];
    }
    return [];
  }

  let cursor = startOfDay(new Date(bill.start_date));
  const MAX_ITER = 2000;
  let iter = 0;

  // Walk cursor back to before the window so we don't miss occurrences
  // whose anchor falls inside or after the window start
  while (!isBefore(cursor, start) && iter < MAX_ITER) {
    cursor = stepBack(cursor, bill.frequency);
    iter++;
  }

  // Now walk forward and collect every occurrence inside the window
  const occurrences = [];
  iter = 0;
  while (!isAfter(cursor, end) && iter < MAX_ITER) {
    if (!isBefore(cursor, start)) {
      occurrences.push(new Date(cursor));
    }
    cursor = stepForward(cursor, bill.frequency);
    iter++;
  }
  return occurrences;
}

/**
 * Returns all bills due within a pay cycle, with their exact due dates.
 */
export function getBillsInCycle(bills, cycleStart, cycleEnd) {
  const result = [];
  bills.forEach(bill => {
    const occurrences = getBillOccurrencesInWindow(bill, cycleStart, cycleEnd);
    occurrences.forEach(dueDate => {
      result.push({ ...bill, dueDate, monthAmount: bill.amount });
    });
  });
  return result.sort((a, b) => a.dueDate - b.dueDate);
}

/**
 * Returns bills that are NOT due in this cycle but ARE active recurring bills.
 */
export function getBillsNotInCycle(allBills, cycleBills, cycleStart, cycleEnd) {
  const dueIds = new Set(cycleBills.map(b => b.id));
  return allBills.filter(b => b.is_recurring !== false && !dueIds.has(b.id));
}

export function formatCycleLabel(cycle, index) {
  if (index === 0) return 'This Pay Cycle';
  if (index === 1) return 'Next Pay Cycle';
  return format(cycle.start, 'd MMM') + ' – ' + format(cycle.end, 'd MMM');
}