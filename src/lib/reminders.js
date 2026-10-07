/**
 * User-configured reminders.
 *
 * Reminders are optional, per-item heads-up the user opts into. Each fires
 * `advance_days` before its event (or, for deadlines, also when overdue). The
 * date source depends on the reminder type:
 *   bill_due          -> next bill occurrence (any bill)
 *   renewal           -> bill.renewal_date
 *   debt_repayment    -> next occurrence of a loans/credit_cards bill
 *   savings_deadline  -> reminder.target_date (savings goals carry no date)
 *   sinking_fund_target -> fund.target_date
 *
 * Active reminders are merged into the Dashboard "Things to Know" list
 * alongside automatic alerts.
 */
import { startOfDay, differenceInCalendarDays, format } from 'date-fns';
import { getNextBillOccurrence, getEffectiveBillShare } from './forecast';
import { formatMoney } from './money';

const DEBT_CATEGORIES = ['loans', 'credit_cards'];
const DEADLINE_TYPES = ['savings_deadline', 'sinking_fund_target'];

function findItem(reminder, bills, goals, sinkingFunds) {
  if (reminder.item_type === 'bill') return (bills || []).find(b => b.id === reminder.item_id);
  if (reminder.item_type === 'savings_goal') return (goals || []).find(g => g.id === reminder.item_id);
  if (reminder.item_type === 'sinking_fund') return (sinkingFunds || []).find(f => f.id === reminder.item_id);
  return null;
}

function getReminderDate(reminder, item) {
  switch (reminder.reminder_type) {
    case 'bill_due':
      return item ? getNextBillOccurrence(item, new Date()) : null;
    case 'renewal':
      return item?.renewal_date ? new Date(item.renewal_date) : null;
    case 'debt_repayment':
      return item ? getNextBillOccurrence(item, new Date()) : null;
    case 'savings_deadline':
      return reminder.target_date ? new Date(reminder.target_date) : null;
    case 'sinking_fund_target':
      return item?.target_date ? new Date(item.target_date) : null;
    default:
      return null;
  }
}

function getActionUrl(reminder) {
  if (reminder.item_type === 'bill') return '/bills';
  if (reminder.item_type === 'savings_goal') return '/savings';
  if (reminder.item_type === 'sinking_fund') return '/sinking-funds';
  return '/';
}

function buildMessage(reminder, item, date, daysUntil, currency) {
  const when = format(date, 'd MMM yyyy');
  if (daysUntil < 0) return `Overdue — was due ${when}.`;
  if (daysUntil === 0) return `Due today (${when}).`;
  let amount = '';
  if (reminder.reminder_type === 'bill_due' || reminder.reminder_type === 'debt_repayment') {
    const occ = item ? getNextBillOccurrence(item, new Date()) : null;
    if (occ && item) {
      amount = ` — ${formatMoney(getEffectiveBillShare(item, occ), { currency, decimals: 2 })}`;
    }
  }
  return `Due in ${daysUntil} days (${when})${amount}.`;
}

/**
 * Resolve which user reminders are currently active (within their advance
 * window, or overdue for deadlines). Returns alert-shaped objects so they can
 * be merged with automatic alerts in "Things to Know".
 */
export function getActiveReminders({ reminders = [], bills = [], goals = [], sinkingFunds = [], currency = '£' }) {
  const today = startOfDay(new Date());
  const active = [];
  (reminders || []).filter(r => r.enabled).forEach(r => {
    const item = findItem(r, bills, goals, sinkingFunds);
    const targetDate = getReminderDate(r, item);
    if (!targetDate) return;
    const daysUntil = differenceInCalendarDays(targetDate, today);
    const isDeadline = DEADLINE_TYPES.includes(r.reminder_type);
    if (isDeadline) {
      if (daysUntil > r.advance_days) return;
    } else {
      if (daysUntil < 0 || daysUntil > r.advance_days) return;
    }
    const overdue = daysUntil < 0;
    active.push({
      key: `reminder:${r.id}`,
      type: 'reminder',
      reminderType: r.reminder_type,
      priority: overdue ? 'attention' : 'information',
      title: `Reminder: ${r.item_name}`,
      message: buildMessage(r, item, targetDate, daysUntil, currency),
      date: targetDate,
      actionUrl: getActionUrl(r),
      dismissible: true,
      reminderId: r.id,
    });
  });
  return active;
}

/** Reminder type options available for a given item. */
export function availableReminderTypes(itemType, item) {
  if (itemType === 'bill') {
    const types = [{ value: 'bill_due', label: 'Bill due date' }];
    if (item?.renewal_date) types.push({ value: 'renewal', label: 'Renewal date' });
    if (item && DEBT_CATEGORIES.includes(item.category)) types.push({ value: 'debt_repayment', label: 'Debt repayment' });
    return types;
  }
  if (itemType === 'savings_goal') return [{ value: 'savings_deadline', label: 'Savings deadline' }];
  if (itemType === 'sinking_fund') return [{ value: 'sinking_fund_target', label: 'Sinking fund target date' }];
  return [];
}