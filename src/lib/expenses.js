/**
 * Shared expense category metadata and helpers for the one-off spending tracker.
 */

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Drink', color: '#0d9488' },
  { value: 'transport', label: 'Transport', color: '#3b82f6' },
  { value: 'shopping', label: 'Shopping', color: '#a855f7' },
  { value: 'entertainment', label: 'Entertainment', color: '#f59e0b' },
  { value: 'health', label: 'Health', color: '#ec4899' },
  { value: 'gifts', label: 'Gifts', color: '#ef4444' },
  { value: 'travel', label: 'Travel', color: '#14b8a6' },
  { value: 'household', label: 'Household', color: '#6366f1' },
  { value: 'bills', label: 'Bills', color: '#64748b' },
  { value: 'other', label: 'Other', color: '#9ca3af' },
];

const CATEGORY_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.value, c]));

export function getCategoryMeta(value) {
  return CATEGORY_MAP[value] || CATEGORY_MAP.other;
}

export const PAYMENT_METHOD_LABELS = {
  card: 'Card',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  direct_debit: 'Direct Debit',
  other: 'Other',
};

/** Period filter options for the expenses page. */
export const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

/**
 * Returns [start, end) Date boundaries for the given period key relative to
 * the supplied reference date (defaults to now).
 */
export function getPeriodRange(period, ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  switch (period) {
    case 'this_month':
      return [new Date(y, m, 1), new Date(y, m + 1, 1)];
    case 'last_month':
      return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    case 'this_year':
      return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
    default:
      return [null, null];
  }
}

/** True when the expense's date falls within the period range (inclusive of start, exclusive of end). */
export function isInPeriod(expense, period, ref = new Date()) {
  if (period === 'all') return true;
  const [start, end] = getPeriodRange(period, ref);
  const d = new Date(expense.date + 'T00:00:00');
  if (start && d < start) return false;
  if (end && d >= end) return false;
  return true;
}