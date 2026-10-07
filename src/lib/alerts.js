/**
 * Unified Alerts engine.
 *
 * One source of truth for automatic, event-driven alerts. Consolidates the
 * former standalone renewal/intro-price alerts and the bill-increase banner
 * into a single prioritised list so the Dashboard can present "Things to
 * Know" without competing notification surfaces.
 *
 * Every alert is derived from data AfterBills already holds (forecast, payday
 * planner, bills, income streams, savings goals, sinking funds). Each carries
 * a stable `key` so dismissals persist across sessions, and a priority:
 *   - important   : projected shortfall, notice period passed
 *   - attention   : buffer breach, heavy cycle, renewals, behind-target, ...
 *   - information : annual bill due soon, debt milestones, one-off bonuses
 *
 * Only `information` alerts are dismissible; `attention`/`important` persist
 * until the underlying condition resolves.
 */
import { startOfDay, addDays, differenceInCalendarDays, format } from 'date-fns';
import { getEffectiveBillShare, getNextBillOccurrence } from './forecast';
import { getUpcomingRenewals, getIntroPriceExpiries } from './contracts';
import { getSinkingFundStats } from './sinkingFunds';
import { formatMoney } from './money';
import { generateAnnualPaymentSuggestions } from './annualPayment';

const DEBT_CATEGORIES = ['loans', 'credit_cards'];
const DEBT_MILESTONE_THRESHOLDS = [50, 75, 100];

export const PRIORITY_RANK = { important: 0, attention: 1, information: 2 };

function priorityThenDate(a, b) {
  const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  if (p !== 0) return p;
  return new Date(a.date) - new Date(b.date);
}

/* ------------------------------------------------------------------ *
 * Individual alert detectors
 * ------------------------------------------------------------------ */

function getNegativePositionAlerts(forecast, currency) {
  const alerts = [];
  (forecast || []).slice(0, 3).forEach(m => {
    if (m.remaining < 0) {
      alerts.push({
        key: `negative_position:${m.year}-${m.month}`,
        type: 'negative_position',
        priority: 'important',
        title: `Projected shortfall in ${m.label}`,
        message: `Bills exceed income by ${formatMoney(Math.abs(m.remaining), { currency, decimals: 0 })} in ${m.label}.`,
        date: m.date,
        actionUrl: '/payday-planner',
        dismissible: false,
      });
    }
  });
  return alerts;
}

function getBufferDropAlerts(plannerData, buffer, currency) {
  if (!buffer || buffer <= 0) return [];
  const alerts = [];
  (plannerData || []).slice(0, 4).forEach(c => {
    if (c.amountLeft < buffer) {
      alerts.push({
        key: `buffer_drop:${c.cycle.start.toISOString().slice(0, 10)}`,
        type: 'buffer_drop',
        priority: 'attention',
        title: `Below your buffer on ${format(c.cycle.start, 'd MMM')}`,
        message: `Forecast leaves ${formatMoney(c.amountLeft, { currency, decimals: 0 })}, under your ${formatMoney(buffer, { currency, decimals: 0 })} buffer.`,
        date: c.cycle.start,
        actionUrl: '/payday-planner',
        dismissible: false,
      });
    }
  });
  return alerts;
}

function getExpensiveCycleAlerts(plannerData, currency) {
  const upcoming = (plannerData || []).slice(1, 5);
  if (upcoming.length < 2) return [];
  const avg = upcoming.reduce((s, c) => s + c.totalCommitted, 0) / upcoming.length;
  if (avg <= 0) return [];
  const alerts = [];
  upcoming.forEach(c => {
    if (c.totalCommitted > avg * 1.4 && c.totalCommitted > avg + 50) {
      alerts.push({
        key: `expensive_cycle:${c.cycle.start.toISOString().slice(0, 10)}`,
        type: 'expensive_cycle',
        priority: 'attention',
        title: `Heavy pay cycle on ${format(c.cycle.start, 'd MMM')}`,
        message: `${formatMoney(c.totalCommitted, { currency, decimals: 0 })} in commitments, well above your ${formatMoney(avg, { currency, decimals: 0 })} average.`,
        date: c.cycle.start,
        actionUrl: '/payday-planner',
        dismissible: false,
      });
    }
  });
  return alerts;
}

function getAnnualBillAlerts(bills, currency) {
  const alerts = [];
  const today = startOfDay(new Date());
  (bills || []).forEach(bill => {
    if (!['annually', 'quarterly'].includes(bill.frequency)) return;
    const next = getNextBillOccurrence(bill, today);
    if (!next) return;
    const daysUntil = differenceInCalendarDays(next, today);
    if (daysUntil < 0 || daysUntil > 30) return;
    const amt = getEffectiveBillShare(bill, next);
    alerts.push({
      key: `annual_bill:${bill.id}:${next.toISOString().slice(0, 10)}`,
      type: 'annual_bill',
      priority: 'information',
      title: `“${bill.name}” due ${format(next, 'd MMM')}`,
      message: `${formatMoney(amt, { currency, decimals: 2 })} due ${daysUntil === 0 ? 'today' : `in ${daysUntil} days`} (${bill.frequency}).`,
      date: next,
      actionUrl: '/bills',
      dismissible: true,
    });
  });
  return alerts;
}

function getRenewalAlerts(bills, currency) {
  return getUpcomingRenewals(bills, 60).map(({ bill, renewalDate, daysUntil, noticeDaysLeft }) => {
    const noticePassed = noticeDaysLeft != null && noticeDaysLeft <= 0;
    const notice = noticeDaysLeft != null
      ? ` ${noticePassed ? '— notice period passed' : `— notice by ${noticeDaysLeft}d`}`
      : '';
    return {
      key: `renewal:${bill.id}`,
      type: 'renewal',
      priority: noticePassed ? 'important' : 'attention',
      title: `“${bill.name}” renews ${format(renewalDate, 'd MMM yyyy')}`,
      message: `${daysUntil === 0 ? 'Today' : `${daysUntil} days`} until renewal${notice}.`,
      date: renewalDate,
      actionUrl: '/bills',
      dismissible: false,
    };
  });
}

function getIntroPriceAlerts(bills, currency) {
  return getIntroPriceExpiries(bills, 30).map(({ bill, expiryDate, daysUntil }) => ({
    key: `intro_price:${bill.id}`,
    type: 'intro_price',
    priority: 'attention',
    title: `“${bill.name}” intro price ending`,
    message: `${daysUntil < 0 ? 'Expired' : daysUntil === 0 ? 'Ends today' : `Ends in ${daysUntil}d`}${bill.expected_new_price != null ? ` — expect ${formatMoney(bill.expected_new_price, { currency, decimals: 2 })}` : ''}.`,
    date: expiryDate,
    actionUrl: '/bills',
    dismissible: false,
    action: bill.expected_new_price != null ? {
      kind: 'apply_intro_price',
      billId: bill.id,
      newPrice: bill.expected_new_price,
      oldAmount: bill.amount,
      history: bill.amount_history || [],
    } : null,
  }));
}

function getBehindGoalAlerts(goals, monthlySpare, currency) {
  const alerts = [];
  (goals || []).forEach(g => {
    if (g.is_emergency_fund) return;
    const target = parseFloat(g.target_amount) || 0;
    const current = parseFloat(g.current_amount) || 0;
    if (target <= 0 || current >= target) return;
    if (monthlySpare > 0) return;
    alerts.push({
      key: `behind_goal:${g.id}`,
      type: 'behind_goal',
      priority: 'attention',
      title: `“${g.name}” is behind target`,
      message: `No spare left to save this month — ${formatMoney(target - current, { currency, decimals: 0 })} still to save.`,
      date: new Date(),
      actionUrl: '/savings',
      dismissible: false,
    });
  });
  return alerts;
}

function getBehindFundAlerts(sinkingFunds, currency) {
  const alerts = [];
  (sinkingFunds || []).forEach(fund => {
    const stats = getSinkingFundStats(fund);
    if (stats.trackingStatus !== 'behind') return;
    const when = fund.target_date ? format(new Date(fund.target_date), 'd MMM yyyy') : 'its target';
    alerts.push({
      key: `behind_fund:${fund.id}`,
      type: 'behind_fund',
      priority: 'attention',
      title: `“${fund.name}” is behind pace`,
      message: `${formatMoney(stats.remaining, { currency, decimals: 0 })} to go by ${when} — needs ${formatMoney(stats.monthlyContribution, { currency, decimals: 0 })}/mo.`,
      date: fund.target_date ? new Date(fund.target_date) : new Date(),
      actionUrl: '/sinking-funds',
      dismissible: false,
    });
  });
  return alerts;
}

function getDebtMilestoneAlerts(bills, currency) {
  const alerts = [];
  (bills || []).forEach(bill => {
    if (!DEBT_CATEGORIES.includes(bill.category)) return;
    const remaining = Math.max(0, parseFloat(bill.remaining_balance) || 0);
    const original = parseFloat(bill.original_balance) || 0;
    if (original <= 0) return;
    const pctRepaid = Math.min(100, Math.max(0, ((original - remaining) / original) * 100));
    let reached = null;
    for (const t of DEBT_MILESTONE_THRESHOLDS) if (pctRepaid >= t) reached = t;
    if (reached == null) return;
    const cleared = remaining <= 0 || reached === 100;
    alerts.push({
      key: `debt_milestone:${bill.id}:${reached}`,
      type: 'debt_milestone',
      priority: 'information',
      title: cleared ? `“${bill.name}” debt cleared` : `“${bill.name}” ${reached}% repaid`,
      message: cleared
        ? `You've fully repaid “${bill.name}”.`
        : `You've repaid ${reached}% of “${bill.name}” — ${formatMoney(original - remaining, { currency, decimals: 0 })} of ${formatMoney(original, { currency, decimals: 0 })}.`,
      date: new Date(),
      actionUrl: '/bills',
      dismissible: true,
    });
  });
  return alerts;
}

function getUpcomingChangeAlerts(bills, incomeStreams, currency) {
  const alerts = [];
  const today = startOfDay(new Date());
  const horizon = addDays(today, 30);
  (bills || []).forEach(bill => {
    (bill.scheduled_changes || []).forEach(c => {
      if (!c.effective_date) return;
      const d = startOfDay(new Date(c.effective_date));
      if (d < today || d > horizon) return;
      const amt = parseFloat(c.amount) || 0;
      alerts.push({
        key: `scheduled_change:${bill.id}:${c.id || d.toISOString().slice(0, 10)}`,
        type: 'scheduled_change',
        priority: 'attention',
        title: `${c.label || 'Price change'} for “${bill.name}”`,
        message: `Takes effect ${format(d, 'd MMM yyyy')} — new amount ${formatMoney(amt, { currency, decimals: 2 })}.`,
        date: d,
        actionUrl: '/bills',
        dismissible: false,
      });
    });
  });
  (incomeStreams || []).forEach(s => {
    (s.scheduled_changes || []).forEach(c => {
      if (!c.effective_date) return;
      const d = startOfDay(new Date(c.effective_date));
      if (d < today || d > horizon) return;
      const amt = parseFloat(c.amount) || 0;
      const isOneOff = c.change_type === 'one_off';
      const label = isOneOff ? 'Bonus' : c.change_type === 'addition' ? 'Extra income' : (c.label || 'Income change');
      alerts.push({
        key: `scheduled_change_income:${s.id}:${c.id || d.toISOString().slice(0, 10)}`,
        type: 'scheduled_change',
        priority: isOneOff ? 'information' : 'attention',
        title: `${label} on “${s.name}”`,
        message: `Takes effect ${format(d, 'd MMM yyyy')}${amt ? ` — ${formatMoney(amt, { currency, decimals: 0 })}` : ''}.`,
        date: d,
        actionUrl: '/settings',
        dismissible: isOneOff,
      });
    });
  });
  return alerts;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Compute all automatic alerts, filtered by the user's dismissals.
 * @returns array of alert objects sorted by priority then date.
 */
export function getAlerts({
  bills = [],
  incomeStreams = [],
  sinkingFunds = [],
  goals = [],
  forecast = [],
  plannerData = [],
  buffer = 0,
  monthlySpare = 0,
  currency = '£',
  dismissedKeys = [],
}) {
  const all = [
    ...getNegativePositionAlerts(forecast, currency),
    ...getBufferDropAlerts(plannerData, buffer, currency),
    ...getExpensiveCycleAlerts(plannerData, currency),
    ...getAnnualBillAlerts(bills, currency),
    ...getRenewalAlerts(bills, currency),
    ...getIntroPriceAlerts(bills, currency),
    ...getBehindGoalAlerts(goals, monthlySpare, currency),
    ...getBehindFundAlerts(sinkingFunds, currency),
    ...getDebtMilestoneAlerts(bills, currency),
    ...getUpcomingChangeAlerts(bills, incomeStreams, currency),
    ...generateAnnualPaymentSuggestions(bills, goals, monthlySpare, currency),
  ];
  const dismissed = new Set(dismissedKeys);
  return all.filter(a => !dismissed.has(a.key)).sort(priorityThenDate);
}