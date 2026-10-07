import { differenceInCalendarDays, addDays } from 'date-fns';

/**
 * Get the notice deadline date (renewal_date minus notice_period_days).
 */
export function getNoticeDeadline(bill) {
  if (!bill.renewal_date || !bill.notice_period_days) return null;
  return addDays(new Date(bill.renewal_date), -bill.notice_period_days);
}

/**
 * Get bills with a renewal_date within the next `daysAhead` days.
 * Returns array of { bill, renewalDate, daysUntil, noticeDeadline, noticeDaysLeft }.
 */
export function getUpcomingRenewals(bills, daysAhead = 60) {
  const today = new Date();
  return bills
    .filter(b => b.renewal_date)
    .map(b => {
      const renewalDate = new Date(b.renewal_date);
      const daysUntil = differenceInCalendarDays(renewalDate, today);
      const noticeDeadline = getNoticeDeadline(b);
      const noticeDaysLeft = noticeDeadline ? differenceInCalendarDays(noticeDeadline, today) : null;
      return { bill: b, renewalDate, daysUntil, noticeDeadline, noticeDaysLeft };
    })
    .filter(r => r.daysUntil >= 0 && r.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get bills with an intro_price_end_date within `daysAhead` days (or already expired).
 * Returns array of { bill, expiryDate, daysUntil }.
 */
export function getIntroPriceExpiries(bills, daysAhead = 30) {
  const today = new Date();
  return bills
    .filter(b => b.intro_price_end_date)
    .map(b => {
      const expiryDate = new Date(b.intro_price_end_date);
      const daysUntil = differenceInCalendarDays(expiryDate, today);
      return { bill: b, expiryDate, daysUntil };
    })
    .filter(r => r.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get bills whose renewal_date falls on a specific calendar day.
 */
export function getRenewalsForDay(bills, day, month, year) {
  return bills.filter(b => {
    if (!b.renewal_date) return false;
    const d = new Date(b.renewal_date);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });
}