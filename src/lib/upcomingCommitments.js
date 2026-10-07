/**
 * Upcoming Commitments — computes near-term financial commitments
 * (bills, debt repayments, annual expenses, renewal dates, and sinking
 * fund contributions) falling within a given number of days from today.
 */
import { startOfDay, addDays, addWeeks, addMonths, startOfMonth } from 'date-fns';
import { getBillShare } from './forecast';
import { roundMoney } from './money';
import { getSinkingFundMonthlyContribution } from './sinkingFunds';
import { FREQ_TO_MONTHLY } from './income';

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

function getOccurrencesInRange(anchorDate, frequency, startDate, endDate) {
  const occurrences = [];
  let cursor = startOfDay(new Date(anchorDate));
  const MAX_ITER = 3000;
  let iter = 0;
  while (cursor < startDate && iter < MAX_ITER) {
    cursor = stepForward(cursor, frequency);
    iter++;
  }
  iter = 0;
  while (cursor <= endDate && iter < MAX_ITER) {
    if (cursor >= startDate) occurrences.push(new Date(cursor));
    cursor = stepForward(cursor, frequency);
    iter++;
  }
  return occurrences;
}

/**
 * Returns a sorted list of commitment events within `days` days from today.
 * Each event: { type, name, amount, date, category?, billId?, fundId? }
 */
export function getUpcomingCommitments(bills, sinkingFunds, days) {
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, days);
  const events = [];

  bills.forEach(bill => {
    if (!bill.start_date) return;
    const isDebt = bill.category === 'loans' || bill.category === 'credit_cards';
    const isAnnual = bill.frequency === 'annually';
    const amount = getBillShare(bill);
    if (amount <= 0) return;
    const occurrences = getOccurrencesInRange(bill.start_date, bill.frequency, today, windowEnd);
    occurrences.forEach(date => {
      events.push({
        type: isDebt ? 'debt' : (isAnnual ? 'annual' : 'bill'),
        name: bill.name,
        amount,
        date,
        category: bill.category,
        billId: bill.id,
      });
    });
  });

  bills.forEach(bill => {
    if (!bill.renewal_date) return;
    const renewalDate = startOfDay(new Date(bill.renewal_date));
    if (renewalDate >= today && renewalDate <= windowEnd) {
      events.push({
        type: 'renewal',
        name: `${bill.name} renewal`,
        amount: getBillShare(bill),
        date: renewalDate,
        category: bill.category,
        billId: `${bill.id}-renewal`,
      });
    }
  });

  sinkingFunds.forEach(fund => {
    if (fund.status === 'completed') return;
    const monthlyContribution = getSinkingFundMonthlyContribution(fund);
    if (monthlyContribution <= 0) return;
    const freq = fund.contribution_frequency || 'monthly';
    const multiplier = FREQ_TO_MONTHLY[freq] || 1;
    const perCycleAmount = roundMoney(monthlyContribution / multiplier);
    if (perCycleAmount <= 0) return;
    const anchor = startOfMonth(today);
    const dates = getOccurrencesInRange(anchor, freq, today, windowEnd);
    dates.forEach(date => {
      events.push({
        type: 'sinking_fund',
        name: fund.name,
        amount: perCycleAmount,
        date,
        fundId: fund.id,
      });
    });
  });

  events.sort((a, b) => a.date - b.date);
  return events;
}

/**
 * Group events by their source bill/fund so recurring items show once
 * with an occurrence count, rather than listing every occurrence.
 */
export function groupCommitmentsForDisplay(events) {
  const groups = {};
  events.forEach(ev => {
    const key = ev.billId || ev.fundId || `${ev.type}-${ev.name}`;
    if (!groups[key]) {
      groups[key] = { ...ev, count: 0, totalAmount: 0, firstDate: ev.date };
    }
    groups[key].count += 1;
    groups[key].totalAmount = roundMoney(groups[key].totalAmount + ev.amount);
    if (ev.date < groups[key].firstDate) groups[key].firstDate = ev.date;
  });
  return Object.values(groups).sort((a, b) => a.firstDate - b.firstDate);
}

export function sumCommitments(events) {
  return roundMoney(events.reduce((sum, ev) => sum + ev.amount, 0));
}