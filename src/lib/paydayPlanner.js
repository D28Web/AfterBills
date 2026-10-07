/**
 * Payday Planner — computes a full per-cycle financial breakdown for each
 * upcoming payday using actual dates (not monthly averages).
 *
 * For each pay cycle:
 *  - expected income (primary + additional streams paying in the cycle)
 *  - bills due before the following payday (actual occurrence dates)
 *  - debt repayments (loans / credit cards, separated out)
 *  - sinking fund contributions (prorated by actual cycle length)
 *  - planned savings (suggested allocation of what's left)
 *  - total committed, amount left, and per-week availability
 */
import { startOfDay, differenceInDays, isBefore, isAfter } from 'date-fns';
import { getPayCycles, getBillOccurrencesInWindow } from './payday';
import { getBillShare } from './forecast';
import { getSinkingFundMonthlyContribution } from './sinkingFunds';
import { FREQ_TO_MONTHLY, getOtherStreams } from './income';
import { roundMoney } from './money';

const DEBT_CATEGORIES = ['loans', 'credit_cards'];
const SAVINGS_SUGGESTION_RATE = 0.5;
const AVG_DAYS_PER_MONTH = 30.44;

function getAdditionalIncomeInCycle(streams, cycleStart, cycleEnd) {
  let total = 0;
  const details = [];
  streams.forEach(stream => {
    if (stream.is_primary) return;
    if (stream.income_mode === 'salary') return;

    if (stream.end_date) {
      const endDate = startOfDay(new Date(stream.end_date));
      if (isAfter(cycleStart, endDate)) return;
    }

    if (stream.frequency === 'irregular') {
      if (!stream.next_payment_date) return;
      const payDate = startOfDay(new Date(stream.next_payment_date));
      if (!isBefore(payDate, cycleStart) && !isAfter(payDate, cycleEnd)) {
        const amt = parseFloat(stream.amount) || 0;
        total += amt;
        details.push({ name: stream.name, amount: amt, date: payDate });
      }
      return;
    }

    if (!stream.start_date) return;

    const occurrences = getBillOccurrencesInWindow(stream, cycleStart, cycleEnd);
    occurrences.forEach(date => {
      const amt = parseFloat(stream.amount) || 0;
      total += amt;
      details.push({ name: stream.name, amount: amt, date });
    });
  });
  return { total: roundMoney(total), details };
}

export function getPaydayPlannerData(primaryCtx, bills, incomeStreams, sinkingFunds, count = 6) {
  const freq = primaryCtx?.pay_frequency || 'monthly';
  const monthlyIncome = primaryCtx?.monthly_income || 0;

  if (!monthlyIncome) return [];

  const cycleIncome = monthlyIncome / (FREQ_TO_MONTHLY[freq] || 1);
  const cycles = getPayCycles(primaryCtx, count);

  return cycles.map(cycle => {
    const primaryAmount = roundMoney(cycleIncome);
    const additional = getAdditionalIncomeInCycle(incomeStreams, cycle.start, cycle.end);
    const totalIncome = roundMoney(primaryAmount + additional.total);

    const allBillsInCycle = [];
    bills.forEach(bill => {
      const occurrences = getBillOccurrencesInWindow(bill, cycle.start, cycle.end);
      occurrences.forEach(dueDate => {
        allBillsInCycle.push({
          name: bill.name,
          amount: getBillShare(bill),
          dueDate,
          category: bill.category,
        });
      });
    });

    const regularBills = allBillsInCycle
      .filter(b => !DEBT_CATEGORIES.includes(b.category))
      .sort((a, b) => a.dueDate - b.dueDate);
    const debtRepayments = allBillsInCycle
      .filter(b => DEBT_CATEGORIES.includes(b.category))
      .sort((a, b) => a.dueDate - b.dueDate);

    const regularBillsTotal = roundMoney(regularBills.reduce((s, b) => s + b.amount, 0));
    const debtTotal = roundMoney(debtRepayments.reduce((s, b) => s + b.amount, 0));

    const cycleDays = differenceInDays(cycle.end, cycle.start) + 1;
    const sinkingFundItems = [];
    (sinkingFunds || []).forEach(fund => {
      if (fund.status === 'completed') return;
      const monthlyContribution = getSinkingFundMonthlyContribution(fund);
      if (monthlyContribution <= 0) return;
      const perCycleAmount = roundMoney((monthlyContribution * cycleDays) / AVG_DAYS_PER_MONTH);
      if (perCycleAmount > 0) {
        sinkingFundItems.push({ name: fund.name, amount: perCycleAmount });
      }
    });
    const sinkingFundTotal = roundMoney(sinkingFundItems.reduce((s, f) => s + f.amount, 0));

    const hardCommitments = roundMoney(regularBillsTotal + debtTotal + sinkingFundTotal);
    const availableAfterHard = totalIncome - hardCommitments;
    const plannedSavings = roundMoney(Math.max(0, availableAfterHard) * SAVINGS_SUGGESTION_RATE);

    const totalCommitted = roundMoney(hardCommitments + plannedSavings);
    const amountLeft = roundMoney(totalIncome - totalCommitted);

    const weeksInCycle = cycleDays / 7;
    const perWeekAvailable = weeksInCycle > 0 ? roundMoney(amountLeft / weeksInCycle) : 0;

    return {
      cycle,
      index: cycle.index,
      income: { total: totalIncome, primary: primaryAmount, additional: additional.details },
      regularBills,
      debtRepayments,
      sinkingFundItems,
      plannedSavings,
      totalCommitted,
      amountLeft,
      cycleDays,
      weeksInCycle,
      perWeekAvailable,
      regularBillsTotal,
      debtTotal,
      sinkingFundTotal,
    };
  });
}