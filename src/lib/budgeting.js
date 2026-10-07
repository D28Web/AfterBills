/**
 * Budgeting Rules engine.
 *
 * One underlying classification system (needs, wants, savings, investments,
 * debt_repayment, giving, other) is mapped to each supported budgeting rule's
 * buckets.  Classification is derived automatically from existing bill /
 * expense / savings categories and can be overridden per-item via
 * BudgetOverride records.
 *
 * All monetary math goes through roundMoney / sumMoney.  Income is always the
 * net take-home (salary sacrifice is never re-subtracted), so the budgeting
 * percentages are never based on an incorrectly inflated figure.
 */
import { billToMonthlyCost, CATEGORY_LABELS } from './forecast';
import { getRegularBills, getMonthlySalarySacrifice } from './salarySacrifice';
import { getStreamMonthlyAmount, getEffectiveStreamMonthlyAmount, getOtherStreams, getPrimaryStream, getPrimaryIncomeContext, FREQ_TO_MONTHLY } from './income';
import { getSinkingFundMonthlyContribution } from './sinkingFunds';
import { roundMoney, sumMoney, getSplitShare } from './money';
import { EXPENSE_CATEGORIES } from './expenses';

/* ───────────────────────── Rule definitions ───────────────────────── */

export const BUDGET_CATEGORIES = [
  { key: 'needs', label: 'Needs / Essentials' },
  { key: 'wants', label: 'Wants / Lifestyle' },
  { key: 'savings', label: 'Savings' },
  { key: 'investments', label: 'Investments' },
  { key: 'debt_repayment', label: 'Debt Repayment' },
  { key: 'giving', label: 'Giving' },
  { key: 'other', label: 'Other Spending' },
];

export const BUDGET_RULES = {
  '50/30/20': {
    label: '50/30/20',
    description: 'A balanced split — 50% needs, 30% wants, 20% saving & investing.',
    longDescription: 'The classic rule popularised by Senator Elizabeth Warren. Half your income covers essentials, thirty percent is yours to spend freely, and twenty percent builds your future.',
    buckets: [
      { key: 'needs', label: 'Needs', target: 0.50, categories: ['needs', 'debt_repayment'] },
      { key: 'wants', label: 'Wants', target: 0.30, categories: ['wants', 'other', 'giving'] },
      { key: 'savings', label: 'Saving & Investing', target: 0.20, categories: ['savings', 'investments'] },
    ],
  },
  '60/20/20': {
    label: '60/20/20',
    description: 'For higher essential costs — 60% essentials, 20% lifestyle, 20% saving.',
    longDescription: 'Better suited when housing or other fixed costs take a larger share. You still save a fifth of your income, but accept that essentials need more room.',
    buckets: [
      { key: 'essentials', label: 'Essentials', target: 0.60, categories: ['needs', 'debt_repayment'] },
      { key: 'lifestyle', label: 'Lifestyle', target: 0.20, categories: ['wants', 'other', 'giving'] },
      { key: 'savings', label: 'Saving & Investing', target: 0.20, categories: ['savings', 'investments'] },
    ],
  },
  '70/20/10': {
    label: '70/20/10',
    description: 'Prioritises living costs and debt clearance — 70% living, 20% saving, 10% debt & giving.',
    longDescription: 'A pragmatic rule when you are paying down debt or supporting others. Most of your income covers day-to-day life, a fifth is saved, and a tenth clears debt or goes to giving.',
    buckets: [
      { key: 'living', label: 'Living & Spending', target: 0.70, categories: ['needs', 'wants', 'other'] },
      { key: 'savings', label: 'Saving & Investing', target: 0.20, categories: ['savings', 'investments'] },
      { key: 'debt_giving', label: 'Debt & Giving', target: 0.10, categories: ['debt_repayment', 'giving'] },
    ],
  },
  '80/20': {
    label: '80/20',
    description: 'Simple and flexible — 80% spending, 20% saving.',
    longDescription: 'The simplest rule: spend up to eighty percent of your income however you like, and save the rest. Good when you do not want to track sub-categories.',
    buckets: [
      { key: 'spending', label: 'Spending', target: 0.80, categories: ['needs', 'wants', 'other', 'giving', 'debt_repayment'] },
      { key: 'savings', label: 'Saving & Investing', target: 0.20, categories: ['savings', 'investments'] },
    ],
  },
};

export const RULE_KEYS = Object.keys(BUDGET_RULES);
export const DEFAULT_RULE = '50/30/20';

/* ───────────────────── Default classification ───────────────────── */

const BILL_CATEGORY_TO_BUDGET = {
  housing: 'needs',
  utilities: 'needs',
  insurance: 'needs',
  transport: 'needs',
  food: 'needs',
  health: 'needs',
  education: 'needs',
  subscriptions: 'wants',
  loans: 'debt_repayment',
  credit_cards: 'debt_repayment',
  other: 'other',
};

const EXPENSE_CATEGORY_TO_BUDGET = {
  food: 'needs',
  transport: 'needs',
  shopping: 'wants',
  entertainment: 'wants',
  health: 'needs',
  gifts: 'giving',
  travel: 'wants',
  household: 'needs',
  bills: 'needs',
  other: 'other',
};

/* ──────────────────── Classification helpers ──────────────────── */

/**
 * Build an override lookup map from BudgetOverride records.
 * Key: `${item_type}:${item_id}` → budget_category
 */
export function buildOverrideMap(overrides = []) {
  const map = {};
  (overrides || []).forEach(o => {
    if (o.item_type && o.item_id && o.budget_category) {
      map[`${o.item_type}:${o.item_id}`] = o.budget_category;
    }
  });
  return map;
}

export function classifyBill(bill, overrideMap = {}) {
  const override = overrideMap[`bill:${bill.id}`];
  if (override) return override;
  return BILL_CATEGORY_TO_BUDGET[bill.category] || 'other';
}

export function classifyExpense(expense, overrideMap = {}) {
  const override = overrideMap[`expense:${expense.id}`];
  if (override) return override;
  return EXPENSE_CATEGORY_TO_BUDGET[expense.category] || 'other';
}

export function classifySavingsGoal(goal, overrideMap = {}) {
  const override = overrideMap[`savings_goal:${goal.id}`];
  if (override) return override;
  return 'savings';
}

export function classifySinkingFund(fund, overrideMap = {}) {
  const override = overrideMap[`sinking_fund:${fund.id}`];
  if (override) return override;
  return 'savings';
}

/* ──────────────────── Period scaling ──────────────────── */

/** Scale a monthly amount to the user's display period (weekly, monthly, annual…). */
export function scaleToPeriod(monthlyAmount, period) {
  const mult = FREQ_TO_MONTHLY[period] || 1;
  return roundMoney(monthlyAmount / mult);
}

/* ──────────────────── Expense averaging ──────────────────── */

/**
 * Average monthly expense amount per budget category over the last N complete
 * months.  Falls back to fewer months when less history exists.
 */
function getAverageMonthlyExpenses(expenses = [], overrideMap = {}, monthsBack = 3) {
  if (!expenses.length) return {};
  const now = new Date();
  const buckets = {};
  let monthsWithData = 0;
  for (let i = 1; i <= monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = expenses.filter(e => (e.date || '').startsWith(monthKey));
    if (monthExpenses.length > 0) monthsWithData++;
    monthExpenses.forEach(e => {
      const cat = classifyExpense(e, overrideMap);
      buckets[cat] = (buckets[cat] || 0) + (parseFloat(e.amount) || 0);
    });
  }
  if (monthsWithData === 0) return {};
  const result = {};
  Object.entries(buckets).forEach(([cat, total]) => {
    result[cat] = roundMoney(total / monthsWithData);
  });
  return result;
}

/* ──────────────────── Savings goal monthly ──────────────────── */

function getSavingsGoalMonthly(goal) {
  const target = parseFloat(goal.target_amount) || 0;
  const current = parseFloat(goal.current_amount) || 0;
  const remaining = Math.max(0, target - current);
  if (remaining <= 0) return 0;
  const targetDate = goal.travel_date ? new Date(goal.travel_date) : null;
  if (!targetDate) return 0;
  const now = new Date();
  const monthsRemaining = Math.max(1,
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth())
  );
  return roundMoney(remaining / monthsRemaining);
}

/* ──────────────── Core budget calculation ──────────────── */

/**
 * Calculate the full budgeting breakdown for the user's finances.
 *
 * @param {object} params
 * @param {array}  params.bills         - All Bill records (salary sacrifice filtered internally)
 * @param {array}  params.expenses      - All Expense records (one-off spending)
 * @param {array}  params.sinkingFunds  - All SinkingFund records
 * @param {array}  params.goals         - All SavingsGoal records
 * @param {array}  params.incomeStreams  - All IncomeStream records
 * @param {object} params.user           - User entity (for currency, pay frequency, rule)
 * @param {array}  params.overrides      - BudgetOverride records
 * @returns {object} Budget result with category amounts, bucket breakdowns, and guidance inputs
 */
export function calculateBudget({ bills, expenses, sinkingFunds, goals, incomeStreams, user, overrides = [] }) {
  const ruleKey = user?.budgeting_rule || DEFAULT_RULE;
  const rule = BUDGET_RULES[ruleKey] || BUDGET_RULES[DEFAULT_RULE];
  const overrideMap = buildOverrideMap(overrides);

  // Income: net take-home from primary + other streams
  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const primaryStream = getPrimaryStream(incomeStreams);
  const primaryMonthly = primaryStream ? getEffectiveStreamMonthlyAmount(primaryStream) : primaryCtx.monthly_income;
  const otherMonthly = sumMoney(getOtherStreams(incomeStreams).map(s => getEffectiveStreamMonthlyAmount(s)));
  const monthlyIncome = roundMoney(primaryMonthly + otherMonthly);

  // Salary sacrifice (shown separately, not in budget categories)
  const salarySacrificeMonthly = getMonthlySalarySacrifice(bills);
  const regularBills = getRegularBills(bills);

  // Category amounts (monthly)
  const categoryAmounts = {};
  const categoryItems = {}; // for guidance: which items contribute to each category

  // Bills
  regularBills.forEach(bill => {
    const cat = classifyBill(bill, overrideMap);
    const monthly = billToMonthlyCost(bill);
    categoryAmounts[cat] = roundMoney((categoryAmounts[cat] || 0) + monthly);
    if (!categoryItems[cat]) categoryItems[cat] = [];
    categoryItems[cat].push({ name: bill.name, amount: monthly, source: 'bill', category: bill.category, id: bill.id });
  });

  // Expenses (3-month average)
  const expenseAverages = getAverageMonthlyExpenses(expenses, overrideMap);
  Object.entries(expenseAverages).forEach(([cat, amount]) => {
    categoryAmounts[cat] = roundMoney((categoryAmounts[cat] || 0) + amount);
  });

  // Sinking funds → savings
  (sinkingFunds || []).forEach(fund => {
    if (fund.status === 'completed') return;
    const cat = classifySinkingFund(fund, overrideMap);
    const monthly = getSinkingFundMonthlyContribution(fund);
    if (monthly > 0) {
      categoryAmounts[cat] = roundMoney((categoryAmounts[cat] || 0) + monthly);
      if (!categoryItems[cat]) categoryItems[cat] = [];
      categoryItems[cat].push({ name: fund.name, amount: monthly, source: 'sinking_fund', id: fund.id });
    }
  });

  // Savings goals with target dates → savings (or override)
  (goals || []).forEach(goal => {
    const cat = classifySavingsGoal(goal, overrideMap);
    const monthly = getSavingsGoalMonthly(goal);
    if (monthly > 0) {
      categoryAmounts[cat] = roundMoney((categoryAmounts[cat] || 0) + monthly);
      if (!categoryItems[cat]) categoryItems[cat] = [];
      categoryItems[cat].push({ name: goal.name, amount: monthly, source: 'savings_goal', id: goal.id });
    }
  });

  // Total allocated
  const totalAllocated = sumMoney(Object.values(categoryAmounts));
  const surplus = roundMoney(monthlyIncome - totalAllocated);

  // Bucket breakdowns
  const bucketBreakdown = rule.buckets.map(bucket => {
    const bucketAmount = sumMoney(bucket.categories.map(c => categoryAmounts[c] || 0));
    const targetAmount = roundMoney(monthlyIncome * bucket.target);
    const actualPct = monthlyIncome > 0 ? bucketAmount / monthlyIncome : 0;
    const diff = roundMoney(bucketAmount - targetAmount);
    return {
      key: bucket.key,
      label: bucket.label,
      targetPct: bucket.target,
      actualPct,
      amount: bucketAmount,
      targetAmount,
      diff,
      categories: bucket.categories,
      status: getBucketStatus(actualPct, bucket.target),
    };
  });

  return {
    ruleKey,
    rule,
    monthlyIncome,
    salarySacrificeMonthly,
    categoryAmounts,
    categoryItems,
    totalAllocated,
    surplus,
    bucketBreakdown,
    overrideMap,
  };
}

/* ──────────────────── Status helpers ──────────────────── */

function getBucketStatus(actualPct, targetPct) {
  const diff = actualPct - targetPct;
  const absDiff = Math.abs(diff);
  if (absDiff <= 0.02) return 'on_target';
  if (absDiff <= 0.05) return 'close';
  return diff > 0 ? 'above' : 'below';
}

export const STATUS_LABELS = {
  on_target: 'On target',
  close: 'Close to target',
  above: 'Above target',
  below: 'Below target',
};

export const STATUS_TONES = {
  on_target: 'good',
  close: 'info',
  above: 'warning',
  below: 'info',
};

/* ──────────────────── Guidance generation ──────────────────── */

/**
 * Generate proactive, personalised guidance based on the budget result.
 * Returns an array of guidance items with tone, title, message, and optional action.
 */
export function generateGuidance(budget, currency = '£') {
  const guidance = [];
  const { rule, monthlyIncome, categoryAmounts, categoryItems, surplus, bucketBreakdown } = budget;
  if (monthlyIncome <= 0) return guidance;

  const fmt = (v) => `${currency}${Math.round(v).toLocaleString('en-GB')}`;
  const fmtPct = (v) => `${Math.round(v * 100)}%`;

  // Find the bucket furthest from target
  const furthest = [...bucketBreakdown].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

  bucketBreakdown.forEach(bucket => {
    const targetLabel = fmtPct(bucket.targetPct);

    if (bucket.status === 'above') {
      // Identify contributing categories
      const contributing = bucket.categories
        .map(c => ({ category: c, amount: categoryAmounts[c] || 0, items: categoryItems[c] || [] }))
        .filter(c => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      if (bucket.key === 'needs' || bucket.key === 'essentials') {
        // Needs above target
        const top = contributing[0];
        const topPctOfBucket = bucket.amount > 0 ? top.amount / bucket.amount : 0;
        const topLabel = top ? getBudgetCategoryLabel(top.category) : '';
        const topBillLabel = top?.items?.[0]?.name;

        let message;
        if (top && topPctOfBucket > 0.55) {
          message = `Your ${bucket.label.toLowerCase()} are ${fmt(bucket.diff)} above the ${targetLabel} target. ${topLabel} represents ${Math.round(topPctOfBucket * 100)}% of your ${bucket.label.toLowerCase()} spending, so reducing smaller bills alone is unlikely to bring you fully within the target.`;
        } else {
          message = `Your ${bucket.label.toLowerCase()} are ${fmt(bucket.diff)} above the ${targetLabel} target. The largest contributors are ${contributing.slice(0, 2).map(c => getBudgetCategoryLabel(c.category)).join(' and ')}.`;
        }

        guidance.push({
          tone: 'warning',
          title: `${bucket.label} above target`,
          message,
          action: { type: 'review_bills', label: 'Review bills', categories: contributing.flatMap(c => c.items).slice(0, 5) },
        });

        // Suggest rule change if needs are significantly above
        if (bucket.actualPct > 0.55 && rule.buckets[0].target === 0.50) {
          guidance.push({
            tone: 'suggestion',
            title: 'A different rule may fit better',
            message: `Your essential costs currently make the ${rule.label} rule difficult to achieve. Based on your current finances, 60/20/20 may provide a more realistic benchmark.`,
            action: { type: 'change_rule', label: 'Compare rules', suggestedRule: '60/20/20' },
          });
        }
      } else if (bucket.key === 'wants' || bucket.key === 'lifestyle' || bucket.key === 'spending') {
        // Wants above target — show specific reductions
        const wantsItems = contributing.flatMap(c => c.items);
        const topItems = wantsItems.sort((a, b) => b.amount - a.amount).slice(0, 3);
        if (topItems.length > 0) {
          const reductionNeeded = bucket.diff;
          const topItem = topItems[0];
          const secondItem = topItems[1];
          let message;
          if (secondItem && topItem.amount + secondItem.amount >= reductionNeeded) {
            const r1 = Math.min(topItem.amount, reductionNeeded * 0.6);
            const r2 = Math.min(secondItem.amount, reductionNeeded - r1);
            const newPct = (bucket.amount - r1 - r2) / monthlyIncome;
            message = `Reducing ${topItem.name} by ${fmt(r1)} and ${secondItem.name} by ${fmt(r2)} per month would bring your ${bucket.label.toLowerCase()} from ${fmtPct(bucket.actualPct)} to approximately ${fmtPct(newPct)}.`;
          } else {
            message = `Your ${bucket.label.toLowerCase()} are ${fmt(bucket.diff)} above the ${targetLabel} target. ${topItem.name} is your largest discretionary cost at ${fmt(topItem.amount)}/month.`;
          }
          guidance.push({
            tone: 'warning',
            title: `${bucket.label} above target`,
            message,
            action: { type: 'model_reduction', label: 'Model a reduction', bucket: bucket.key, items: topItems },
          });
        }
      }
    } else if (bucket.status === 'below' && (bucket.key === 'savings' || bucket.label.toLowerCase().includes('saving'))) {
      // Savings below target
      const gap = Math.abs(bucket.diff);
      const weeklyGap = roundMoney(gap * 12 / 52);
      guidance.push({
        tone: 'info',
        title: 'Savings below target',
        message: `You're currently saving ${fmtPct(bucket.actualPct)}, compared with your ${targetLabel} target. An additional ${fmt(gap)} per month (${fmt(weeklyGap)} per week) would bring you to ${targetLabel}.`,
        action: { type: 'increase_savings', label: 'Increase savings', gap, weeklyGap },
      });
    } else if (bucket.status === 'below' && (bucket.key === 'debt_giving' || bucket.key === 'debt_repayment')) {
      // Debt repayment below target
      const gap = Math.abs(bucket.diff);
      guidance.push({
        tone: 'info',
        title: `${bucket.label} below target`,
        message: `Your ${bucket.label.toLowerCase()} are ${fmt(gap)} below the ${targetLabel} target. Only genuine debt repayment is counted here, not ordinary bill payments.`,
        action: { type: 'increase_debt', label: 'Review debts', gap },
      });
    } else if (bucket.status === 'on_target') {
      guidance.push({
        tone: 'good',
        title: `${bucket.label} on target`,
        message: `Your ${bucket.label.toLowerCase()} are at ${fmtPct(bucket.actualPct)}, matching the ${targetLabel} target.`,
      });
    }
  });

  // Surplus guidance
  if (surplus > 0) {
    const savingsBucket = bucketBreakdown.find(b => b.label.toLowerCase().includes('saving'));
    if (savingsBucket && savingsBucket.status === 'below') {
      const redirect = Math.min(surplus, Math.abs(savingsBucket.diff));
      const newSavingsPct = (savingsBucket.amount + redirect) / monthlyIncome;
      guidance.push({
        tone: 'suggestion',
        title: 'Redirect surplus to savings',
        message: `Moving ${fmt(redirect)} of your current ${fmt(surplus)} monthly surplus into savings would increase your saving rate from ${fmtPct(savingsBucket.actualPct)} to ${fmtPct(newSavingsPct)}.`,
        action: { type: 'redirect_surplus', label: 'Redirect surplus', amount: redirect },
      });
    } else if (savingsBucket && savingsBucket.status === 'on_target') {
      guidance.push({
        tone: 'good',
        title: 'You have surplus income',
        message: `You have ${fmt(surplus)} remaining after your allocated spending and savings. You could redirect some of this to a savings goal or investment, or enjoy it guilt-free — you are within your rule.`,
      });
    }
  }

  // Sort: warnings first, then suggestions, then info, then good
  const toneOrder = { warning: 0, suggestion: 1, info: 2, good: 3 };
  guidance.sort((a, b) => (toneOrder[a.tone] || 9) - (toneOrder[b.tone] || 9));

  return guidance;
}

function getBudgetCategoryLabel(key) {
  const cat = BUDGET_CATEGORIES.find(c => c.key === key);
  return cat ? cat.label : key;
}

/* ──────────────────── Rule comparison ──────────────────── */

/**
 * Apply the user's finances to all supported rules and show how close
 * each rule's targets are to the user's actual spending.
 */
export function compareAllRules(budget) {
  const { monthlyIncome, categoryAmounts } = budget;
  return RULE_KEYS.map(ruleKey => {
    const rule = BUDGET_RULES[ruleKey];
    const buckets = rule.buckets.map(bucket => {
      const amount = sumMoney(bucket.categories.map(c => categoryAmounts[c] || 0));
      const actualPct = monthlyIncome > 0 ? amount / monthlyIncome : 0;
      const diff = roundMoney(amount - monthlyIncome * bucket.target);
      return { key: bucket.key, label: bucket.label, targetPct: bucket.target, actualPct, diff, status: getBucketStatus(actualPct, bucket.target) };
    });
    const maxDiff = Math.max(...buckets.map(b => Math.abs(b.diff)));
    const avgPctDiff = buckets.reduce((s, b) => s + Math.abs(b.actualPct - b.targetPct), 0) / buckets.length;
    return { ruleKey, label: rule.label, buckets, maxDiff, avgPctDiff, isClosest: false };
  }).sort((a, b) => a.avgPctDiff - b.avgPctDiff);
}

/* ──────────────────── Scenario modelling ──────────────────── */

/**
 * Recalculate bucket percentages given adjustments to category amounts.
 * @param {object} budget - Base budget result
 * @param {object} adjustments - { categoryKey: deltaAmount } monthly deltas
 * @returns {object} Adjusted bucket breakdown
 */
export function modelScenario(budget, adjustments = {}) {
  const { rule, monthlyIncome, categoryAmounts } = budget;
  const adjustedAmounts = { ...categoryAmounts };
  Object.entries(adjustments).forEach(([cat, delta]) => {
    adjustedAmounts[cat] = roundMoney((adjustedAmounts[cat] || 0) + delta);
  });
  const totalAllocated = sumMoney(Object.values(adjustedAmounts));
  const surplus = roundMoney(monthlyIncome - totalAllocated);
  const bucketBreakdown = rule.buckets.map(bucket => {
    const bucketAmount = sumMoney(bucket.categories.map(c => adjustedAmounts[c] || 0));
    const targetAmount = roundMoney(monthlyIncome * bucket.target);
    const actualPct = monthlyIncome > 0 ? bucketAmount / monthlyIncome : 0;
    return {
      key: bucket.key,
      label: bucket.label,
      targetPct: bucket.target,
      actualPct,
      amount: bucketAmount,
      targetAmount,
      diff: roundMoney(bucketAmount - targetAmount),
      status: getBucketStatus(actualPct, bucket.target),
    };
  });
  return { bucketBreakdown, totalAllocated, surplus, adjustedAmounts };
}

/**
 * Calculate how much of a category's amount can be reduced while staying
 * within the target for its bucket.
 */
export function getMaxDiscretionarySpend(budget, bucketKey) {
  const { rule, monthlyIncome, categoryAmounts } = budget;
  const bucket = rule.buckets.find(b => b.key === bucketKey);
  if (!bucket) return 0;
  const currentAmount = sumMoney(bucket.categories.map(c => categoryAmounts[c] || 0));
  const targetAmount = roundMoney(monthlyIncome * bucket.target);
  return roundMoney(Math.max(0, currentAmount - targetAmount));
}