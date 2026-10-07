/**
 * Shared pay-cycle income calculation.
 *
 * Single source of truth for additional (non-primary) income paid within a
 * pay-cycle window. Used by both the Payday Planner and the Insights engine
 * so they always agree on cycle income totals.
 */
import { startOfDay, isBefore, isAfter } from 'date-fns';
import { getBillOccurrencesInWindow } from './payday';
import { getEffectiveStreamOccurrenceAmount } from './income';
import { roundMoney } from './money';

/**
 * Sum all additional (non-primary) income paid within [cycleStart, cycleEnd].
 *
 * Handles regular streams (per-occurrence), irregular streams (next payment
 * date), one-off scheduled changes (bonuses), and addition scheduled changes
 * (temporary overtime). Salary-mode streams are NOT skipped — their take-home
 * is resolved per-occurrence via getEffectiveStreamOccurrenceAmount.
 *
 * @returns { total: number, details: Array<{ name, amount, date }> }
 */
export function getAdditionalIncomeInCycle(streams, cycleStart, cycleEnd) {
  let total = 0;
  const details = [];

  (streams || []).forEach(stream => {
    if (stream.is_primary) return;

    if (stream.end_date) {
      const endDate = startOfDay(new Date(stream.end_date));
      if (isAfter(cycleStart, endDate)) return;
    }

    // Scheduled one-off payments (bonuses) falling in this cycle
    (stream.scheduled_changes || []).forEach(c => {
      if (c.change_type === 'one_off' && c.effective_date) {
        const d = startOfDay(new Date(c.effective_date));
        if (!isBefore(d, cycleStart) && !isAfter(d, cycleEnd)) {
          const amt = parseFloat(c.amount) || 0;
          total += amt;
          details.push({ name: c.label || stream.name, amount: amt, date: d });
        }
      }
    });

    if (stream.frequency === 'irregular') {
      if (!stream.next_payment_date) return;
      const payDate = startOfDay(new Date(stream.next_payment_date));
      if (!isBefore(payDate, cycleStart) && !isAfter(payDate, cycleEnd)) {
        const amt = getEffectiveStreamOccurrenceAmount(stream, payDate);
        total += amt;
        details.push({ name: stream.name, amount: amt, date: payDate });
      }
      return;
    }

    if (!stream.start_date) return;

    const occurrences = getBillOccurrencesInWindow(stream, cycleStart, cycleEnd);
    occurrences.forEach(date => {
      let amt = getEffectiveStreamOccurrenceAmount(stream, date);
      // Scheduled additions (e.g. temporary overtime) active on this date
      (stream.scheduled_changes || []).forEach(c => {
        if (c.change_type === 'addition' && c.effective_date) {
          const eff = startOfDay(new Date(c.effective_date));
          const end = c.end_date ? startOfDay(new Date(c.end_date)) : null;
          if (!isBefore(date, eff) && (!end || !isAfter(date, end))) amt += parseFloat(c.amount) || 0;
        }
      });
      amt = roundMoney(amt);
      total += amt;
      details.push({ name: stream.name, amount: amt, date });
    });
  });

  return { total: roundMoney(total), details };
}