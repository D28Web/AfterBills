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
import { getEffectiveBillShare } from './forecast';
import { getSinkingFundMonthlyContribution } from './sinkingFunds';
import { FREQ_TO_MONTHLY, getEffectivePrimaryCycleIncome } from './income';
import { roundMoney } from './money';
import { getAdditionalIncomeInCycle } from './incomeCycle';

const DEBT_CATEGORIES = ['loans', 'credit_cards'];
const SAVINGS_SUGGESTION_RATE = 0.5;
const AVG_DAYS_PER_MONTH = 30.44;

export const CONFIDENCE_LABELS = {
  mostly_confirmed: 'Mostly confirmed',
  some_estimates: 'Some estimates',
  highly_variable: 'Highly variable',
};

// getAdditionalIncomeInCycle is imported from ./incomeCycle (shared with insights)

export function getPaydayPlannerData(primaryCtx, bills, incomeStreams, sinkingFunds, oneOffExpenses = [], count = 6) {
  const freq = primaryCtx?.pay_frequency || 'monthly';
  const monthlyIncome = primaryCtx?.monthly_income || 0;

  if (!monthlyIncome) return [];

  const cycleIncome = monthlyIncome / (FREQ_TO_MONTHLY[freq] || 1);
  const cycles = getPayCycles(primaryCtx, count);

  return cycles.map(cycle => {
    const primaryAmount = roundMoney(getEffectivePrimaryCycleIncome(primaryCtx, cycle.start, monthlyIncome));
    const additional = getAdditionalIncomeInCycle(incomeStreams, cycle.start, cycle.end);
    const totalIncome = roundMoney(primaryAmount + additional.total);

    const allBillsInCycle = [];
    bills.forEach(bill => {
      const occurrences = getBillOccurrencesInWindow(bill, cycle.start, cycle.end);
      occurrences.forEach(dueDate => {
        allBillsInCycle.push({
          name: bill.name,
          amount: getEffectiveBillShare(bill, dueDate),
          dueDate,
          category: bill.category,
          intro_price_end_date: bill.intro_price_end_date || null,
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
    const today = startOfDay(new Date());
    const daysUntilPayday = cycle.index === 0
      ? Math.max(1, differenceInDays(cycle.end, today) + 1)
      : cycleDays;
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

    // Known one-off expenses (unpaid trip expenses due in this cycle)
    const oneOffItems = [];
    (oneOffExpenses || []).forEach(exp => {
      if (exp.is_paid || !exp.due_date) return;
      const dueDate = startOfDay(new Date(exp.due_date));
      if (isBefore(dueDate, cycle.start) || isAfter(dueDate, cycle.end)) return;
      const amt = parseFloat(exp.amount) || 0;
      const share = exp.is_split ? amt / (exp.split_between || 2) : amt;
      oneOffItems.push({ name: exp.description || exp.trip_name, amount: roundMoney(share), dueDate });
    });
    oneOffItems.sort((a, b) => a.dueDate - b.dueDate);
    const oneOffTotal = roundMoney(oneOffItems.reduce((s, e) => s + e.amount, 0));

    const hardCommitments = roundMoney(regularBillsTotal + debtTotal + sinkingFundTotal + oneOffTotal);
    const availableAfterHard = totalIncome - hardCommitments;
    const plannedSavings = roundMoney(Math.max(0, availableAfterHard) * SAVINGS_SUGGESTION_RATE);

    const totalCommitted = roundMoney(hardCommitments + plannedSavings);
    const amountLeft = roundMoney(totalIncome - totalCommitted);

    const weeksUntilPayday = daysUntilPayday / 7;
    const perWeekAvailable = weeksUntilPayday > 0 ? roundMoney(amountLeft / weeksUntilPayday) : 0;
    const perDayAvailable = daysUntilPayday > 0 ? roundMoney(amountLeft / daysUntilPayday) : 0;

    // Forecast confidence — based on data reliability, not arbitrary percentages.
    const hasVariableIncome = (incomeStreams || []).some(s => s.is_variable || s.frequency === 'irregular');
    const introPriceCount = allBillsInCycle.filter(b => b.intro_price_end_date).length;
    const estimatedCount = sinkingFundItems.length + oneOffItems.length + introPriceCount;
    const confidence = hasVariableIncome
      ? 'highly_variable'
      : estimatedCount >= 2
        ? 'some_estimates'
        : 'mostly_confirmed';

    return {
      cycle,
      index: cycle.index,
      income: { total: totalIncome, primary: primaryAmount, additional: additional.details },
      regularBills,
      debtRepayments,
      sinkingFundItems,
      oneOffItems,
      plannedSavings,
      totalCommitted,
      amountLeft,
      cycleDays,
      daysUntilPayday,
      perWeekAvailable,
      perDayAvailable,
      regularBillsTotal,
      debtTotal,
      sinkingFundTotal,
      oneOffTotal,
      confidence,
    };
  });
}