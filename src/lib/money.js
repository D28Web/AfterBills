/**
 * Centralised money math + formatting.
 *
 * All monetary values are rounded to the cent (2 decimals) at calculation
 * boundaries to avoid floating-point drift (e.g. 2772.7999999999997), and
 * every display goes through one formatter so presentation is consistent
 * across the app. Logic is unchanged — only precision and presentation.
 */

const LOCALE = 'en-GB';

/** Round to 2 decimal places (the cent), returning a number. Non-finite → 0. */
export function roundMoney(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sum an array of numbers with cent precision. */
export function sumMoney(values) {
  return roundMoney((values || []).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
}

/**
 * Format a monetary value with the given currency symbol.
 * @param {number} value
 * @param {object} opts
 * @param {string} [opts.currency='£']  Currency symbol prefix.
 * @param {number} [opts.decimals=0]    Fraction digits (0 for compact, 2 for exact).
 */
export function formatMoney(value, { currency = '£', decimals = 0 } = {}) {
  const n = Number.isFinite(value) ? value : 0;
  return `${currency}${n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format with a leading + / − sign (for spare / delta displays). */
export function formatSignedMoney(value, { currency = '£', decimals = 0 } = {}) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${currency}${Math.abs(n).toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** A single person's share of a split cost (bill or trip expense). */
export function getSplitShare(item) {
  if (!item) return 0;
  if (item.is_split && item.split_between > 1) return item.amount / item.split_between;
  return item.amount;
}