import { addDays, addWeeks, addMonths, startOfDay, isAfter, isBefore, format } from 'date-fns';

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
    case 'annually':    return addMonths(date, -12);
    default:            return addMonths(date, -1);
  }
}

function getAnchorDate(user) {
  if (user?.pay_start_date) {
    return startOfDay(new Date(user.pay_start_date));
  }
  const today = new Date();
  const payDay = Math.min(parseInt(user?.pay_day) || 1, 28);
  return startOfDay(new Date(today.getFullYear(), today.getMonth(), payDay));
}

/**
 * Returns `count` pay cycles starting from the most recent payday on or before today.
 */
export function getPayCycles(user, count = 3) {
  const today = startOfDay(new Date());
  const freq = user?.pay_frequency || 'monthly';
  let anchor = getAnchorDate(user);

  // Walk to find most recent payday <= today
  if (isAfter(anchor, today)) {
    while (isAfter(anchor, today)) {
      anchor = stepBack(anchor, freq);
    }
  } else {
    let next = stepForward(anchor, freq);
    while (!isAfter(next, today)) {
      anchor = next;
      next = stepForward(anchor, freq);
    }
  }

  const cycles = [];
  let cycleStart = anchor;
  for (let i = 0; i < count; i++) {
    const cycleEnd = addDays(stepForward(cycleStart, freq), -1);
    cycles.push({ start: cycleStart, end: cycleEnd, index: i });
    cycleStart = addDays(cycleEnd, 1);
  }
  return cycles;
}

/**
 * Generate all occurrence dates for a bill from its start_date using its frequency.
 * Returns dates that fall within [windowStart, windowEnd].
 */
export function getBillOccurrencesInWindow(bill, windowStart, windowEnd) {
  if (!bill.start_date) return [];

  let cursor = startOfDay(new Date(bill.start_date));
  const end = startOfDay(new Date(windowEnd));
  const start = startOfDay(new Date(windowStart));
  const occurrences = [];

  // Step forward until we reach or pass the window start
  // but don't overshoot past windowEnd
  const MAX_ITER = 2000;
  let iter = 0;

  // First walk cursor forward past its start if it's way before window
  while (isBefore(cursor, start) && iter < MAX_ITER) {
    cursor = stepForward(cursor, bill.frequency);
    iter++;
  }

  // Now collect all occurrences within the window
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
 * Returns all bills due within a pay cycle date range, with their exact due dates.
 * Each bill occurrence is a separate entry.
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

export function formatCycleLabel(cycle, index) {
  if (index === 0) return 'This Pay Cycle';
  if (index === 1) return 'Next Pay Cycle';
  return format(cycle.start, 'd MMM') + ' – ' + format(cycle.end, 'd MMM');
}