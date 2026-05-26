import { addDays, addWeeks, addMonths, startOfDay, isAfter, format } from 'date-fns';
import { getBillDueDay, isBillDueInMonth, getBillAmountForMonth } from './forecast';

function stepForward(date, freq) {
  switch (freq) {
    case 'weekly':      return addWeeks(date, 1);
    case 'fortnightly': return addWeeks(date, 2);
    case 'four_weekly': return addWeeks(date, 4);
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
 * Returns all bills due within a pay cycle date range.
 */
export function getBillsInCycle(bills, cycleStart, cycleEnd) {
  const result = [];
  const seen = new Set();
  let cursor = new Date(cycleStart);

  while (!isAfter(cursor, cycleEnd)) {
    const day = cursor.getDate();
    const month = cursor.getMonth();
    const year = cursor.getFullYear();

    bills.forEach(bill => {
      if (getBillDueDay(bill) === day && isBillDueInMonth(bill, month, year)) {
        const key = `${bill.id}-${year}-${month}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ ...bill, dueDate: new Date(cursor), monthAmount: getBillAmountForMonth(bill, month, year) });
        }
      }
    });

    cursor = addDays(cursor, 1);
  }

  return result.sort((a, b) => a.dueDate - b.dueDate);
}

export function formatCycleLabel(cycle, index) {
  if (index === 0) return 'This Pay Cycle';
  if (index === 1) return 'Next Pay Cycle';
  return format(cycle.start, 'd MMM') + ' – ' + format(cycle.end, 'd MMM');
}