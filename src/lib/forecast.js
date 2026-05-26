import { addMonths, getDaysInMonth, startOfMonth, format } from 'date-fns';

/**
 * Convert a bill to its monthly equivalent cost.
 */
export function billToMonthlyCost(bill) {
  switch (bill.frequency) {
    case 'weekly': return bill.amount * 52 / 12;
    case 'fortnightly': return bill.amount * 26 / 12;
    case 'monthly': return bill.amount;
    case 'quarterly': return bill.amount / 3;
    case 'annually': return bill.amount / 12;
    default: return bill.amount;
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
  // legacy fallback
  return { anchorMonth: 0, anchorYear: new Date().getFullYear(), dueDay: bill.due_day || 1 };
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
  if (!isBillDueInMonth(bill, month, year)) return 0;

  switch (bill.frequency) {
    case 'weekly': return bill.amount * 52 / 12;
    case 'fortnightly': return bill.amount * 26 / 12;
    case 'monthly': return bill.amount;
    case 'quarterly': return bill.amount;
    case 'annually': return bill.amount;
    default: return bill.amount;
  }
}

/**
 * Generate a 12-month forecast.
 */
export function generateForecast(bills, monthlyIncome, startDate = new Date()) {
  const start = startOfMonth(startDate);
  const months = [];

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

    const remaining = monthlyIncome - totalBills;

    months.push({
      date,
      month,
      year,
      label,
      shortLabel,
      income: monthlyIncome,
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
 * Get bills for a specific day in a month.
 */
export function getBillsForDay(bills, day, month, year) {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  return bills.filter(bill => {
    const dueDay = Math.min(getBillDueDay(bill), daysInMonth);
    return dueDay === day && isBillDueInMonth(bill, month, year);
  });
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
  food: 'Food',
  health: 'Health',
  education: 'Education',
  other: 'Other',
};