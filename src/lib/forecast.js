import { addMonths, addWeeks, getDaysInMonth, startOfDay, startOfMonth, isSameMonth, format, addDays } from 'date-fns';

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
  const stepForward = (d) => frequency === 'weekly' ? addWeeks(d, 1) : addWeeks(d, 2);

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
 * Convert a bill to its monthly equivalent cost.
 */
export function getBillShare(bill) {
  if (bill.is_split && bill.split_between > 1) return bill.amount / bill.split_between;
  return bill.amount;
}

export function billToMonthlyCost(bill) {
  const amount = getBillShare(bill);
  switch (bill.frequency) {
    case 'weekly': return amount * 52 / 12;
    case 'fortnightly': return amount * 26 / 12;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'annually': return amount / 12;
    default: return amount;
  }
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
 * Get the actual bill amount for a given month.
 */
export function getBillAmountForMonth(bill, month, year) {
  const { anchorMonth, anchorYear } = getBillAnchor(bill);
  if (year < anchorYear || (year === anchorYear && month < anchorMonth)) return 0;

  const amount = getBillShare(bill);
  switch (bill.frequency) {
    case 'weekly':
      return amount * countOccurrencesInMonth(bill.start_date, 'weekly', month, year);
    case 'fortnightly':
      return amount * countOccurrencesInMonth(bill.start_date, 'fortnightly', month, year);
    case 'monthly': return amount;
    case 'quarterly': return isBillDueInMonth(bill, month, year) ? amount : 0;
    case 'annually': return isBillDueInMonth(bill, month, year) ? amount : 0;
    default: return amount;
  }
}

/**
 * Calculate monthly income for an income stream (same logic as bills).
 */
export function getIncomeStreamAmountForMonth(stream, month, year) {
  const { anchorMonth, anchorYear } = stream.start_date
    ? (() => { const d = new Date(stream.start_date); return { anchorMonth: d.getMonth(), anchorYear: d.getFullYear() }; })()
    : { anchorMonth: 0, anchorYear: new Date().getFullYear() - 10 };

  if (year < anchorYear || (year === anchorYear && month < anchorMonth)) return 0;

  switch (stream.frequency) {
    case 'weekly':
      return stream.amount * countOccurrencesInMonth(stream.start_date, 'weekly', month, year);
    case 'fortnightly':
      return stream.amount * countOccurrencesInMonth(stream.start_date, 'fortnightly', month, year);
    case 'monthly': return stream.amount;
    case 'quarterly': {
      const elapsed = (year - anchorYear) * 12 + (month - anchorMonth);
      return elapsed % 3 === 0 ? stream.amount : 0;
    }
    case 'annually': {
      const elapsed = (year - anchorYear) * 12 + (month - anchorMonth);
      return elapsed % 12 === 0 ? stream.amount : 0;
    }
    default: return stream.amount;
  }
}

/**
 * Generate a 12-month forecast.
 * When user has a non-monthly pay frequency, income per month is calculated by
 * counting actual paydays that fall in each calendar month.
 */
export function generateForecast(bills, monthlyIncome, startDate = new Date(), incomeStreams = [], user = null) {
  const start = startOfMonth(startDate);
  const months = [];

  // Pre-compute payday-aware income per month if user has non-monthly pay frequency
  let paydayIncomeByMonth = null;
  if (user?.pay_frequency && user.pay_frequency !== 'monthly' && monthlyIncome > 0) {
    const FREQ_MULTIPLIER = {
      weekly: 52 / 12,
      fortnightly: 26 / 12,
      four_weekly: 13 / 12,
      annually: 1 / 12,
    };
    const multiplier = FREQ_MULTIPLIER[user.pay_frequency];
    if (multiplier) {
      const cycleIncome = monthlyIncome / multiplier;
      // Inline payday stepping to avoid circular import with payday.js
      const payCycles = computePayCycles(user, 16);
      paydayIncomeByMonth = {};
      payCycles.forEach(cycleStart => {
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

    // Use payday-accurate income if available, otherwise flat monthly
    const baseIncome = paydayIncomeByMonth
      ? (paydayIncomeByMonth[`${year}-${month}`] || 0)
      : monthlyIncome;

    const totalIncome = baseIncome + extraIncome;
    const remaining = totalIncome - totalBills;

    months.push({
      date,
      month,
      year,
      label,
      shortLabel,
      income: Math.round(totalIncome * 100) / 100,
      totalBills: Math.round(totalBills * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
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
    total: Math.round(total * 100) / 100,
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