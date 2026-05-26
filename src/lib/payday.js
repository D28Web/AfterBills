import { addDays, addWeeks, addMonths, startOfDay, isAfter, isBefore, isEqual, format } from 'date-fns';
import { getBillDueDay, isBillDueInMonth, getBillAmountForMonth } from './forecast';

/**
 * Given user settings, compute the start and end dates of the current and next pay cycles.
 * Pay cycle ends the day before the next pay date.
 */
export function getPayCycles(user, count = 3) {
  const today = startOfDay(new Date());
  const freq = user?.pay_frequency || 'monthly';

  // Resolve the anchor date (first pay date reference)
  let anchor;
  if (user?.pay_start_date) {
    anchor = startOfDay(new Date(user.pay_start_date));
  } else if (user?.pay_day) {
    // Use the current month's pay day as the anchor
    const d = new Date();
    anchor = startOfDay(new Date(d.getFullYear(), d.getMonth(), user.pay_day));
  } else {
    anchor = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  // Step function per frequency
  function nextPayDate(from) {
    switch (freq) {
      case 'weekly': return addWeeks(from, 1);
      case 'fortnightly': return addWeeks(from, 2);
      case 'four_weekly': return addWeeks(from, 4);
      case 'annually': return addMonths(from, 12);
      case 'monthly':
      default:
        return addMonths(from, 1);
    }
  }

  // Walk forward/backward from anchor to find a pay date <= today
  let payDate = new Date(anchor);

  // Walk backward if anchor is in the future
  if (isAfter(payDate, today)) {
    let prev = payDate;
    while (isAfter(prev, today)) {
      payDate = prev;
      prev = prevPayDate(prev, freq);
    }
    // prev is now <= today — use that as the current cycle start
    payDate = prev;
  } else {
    // Walk forward until payDate > today, then step back one
    let next = nextPayDate(payDate);
    while (!isAfter(next, today)) {
      payDate = next;
      next = nextPayDate(payDate);
    }
  }

  // Build `count` cycles starting from payDate
  const cycles = [];
  let cycleStart = payDate;
  for (let i = 0; i < count; i++) {
    const cycleEnd = addDays(nextPayDate(cycleStart), -1);
    cycles.push({ start: cycleStart, end: cycleEnd, index: i });
    cycleStart = addDays(cycleEnd, 1);
  }

  return cycles;
}

function prevPayDate(from, freq) {
  switch (freq) {
    case 'weekly': return addWeeks(from, -1);
    case 'fortnightly': return addWeeks(from, -2);
    case 'four_weekly': return addWeeks(from, -4);
    case 'annually': return addMonths(from, -12);
    case 'monthly':
    default:
      return addMonths(from, -1);
  }
}

/**
 * For a given pay cycle (start/end dates), return all bills that fall within it.
 */
export function getBillsInCycle(bills, cycleStart, cycleEnd) {
  const result = [];

  // Iterate every day in the cycle, collect bills due that day
  let cursor = new Date(cycleStart);
  const seen = new Set();

  while (!isAfter(cursor, cycleEnd)) {
    const day = cursor.getDate();
    const month = cursor.getMonth();
    const year = cursor.getFullYear();

    bills.forEach(bill => {
      const dueDay = getBillDueDay(bill);
      if (dueDay === day && isBillDueInMonth(bill, month, year)) {
        const key = `${bill.id}-${year}-${month}`;
        if (!seen.has(key)) {
          seen.add(key);
          const amount = getBillAmountForMonth(bill, month, year);
          result.push({ ...bill, dueDate: new Date(cursor), monthAmount: amount });
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