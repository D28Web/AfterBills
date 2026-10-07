/**
 * Essential spending classification.
 *
 * Bills can be marked Essential or Non-essential. Sensible defaults are
 * suggested by category, but the user can always override them. A bill with
 * essential === null is treated as the category default for calculations.
 */
import { billToMonthlyCost } from './forecast';
import { roundMoney, sumMoney } from './money';
import { isSalarySacrifice } from './salarySacrifice';

const ESSENTIAL_CATEGORIES = new Set([
  'housing', 'utilities', 'insurance', 'food', 'health',
  'transport', 'loans', 'credit_cards',
]);

/**
 * Suggested default essential classification for a category.
 * Categories not in the essential set default to non-essential, but the
 * user is always prompted to confirm/override — nothing is assumed silently.
 */
export function getDefaultEssential(category) {
  return ESSENTIAL_CATEGORIES.has(category);
}

/**
 * Resolve whether a bill is essential. Uses the explicit user setting if
 * present, otherwise falls back to the category-based default.
 */
export function isEssentialBill(bill) {
  if (bill.essential === true) return true;
  if (bill.essential === false) return false;
  return getDefaultEssential(bill.category);
}

/**
 * Total monthly cost of all essential bills (user's share, monthly equivalent).
 */
export function getMonthlyEssentialExpenses(bills = []) {
  return roundMoney(
    sumMoney((bills || []).filter(b => !isSalarySacrifice(b) && isEssentialBill(b)).map(b => billToMonthlyCost(b)))
  );
}

/**
 * Total monthly cost of all non-essential bills.
 */
export function getMonthlyNonEssentialExpenses(bills = []) {
  return roundMoney(
    sumMoney((bills || []).filter(b => !isSalarySacrifice(b) && !isEssentialBill(b)).map(b => billToMonthlyCost(b)))
  );
}