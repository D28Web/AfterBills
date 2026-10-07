/**
 * Dashboard section definitions, mode presets, and layout resolution.
 *
 * Three presets control which sections appear by default:
 *   simple   — the default for new users; answers the 4 core questions
 *   planning — adds income breakdown and period comparison
 *   detailed — exposes the broader set of widgets
 *
 * Users can still toggle section visibility and reorder sections manually;
 * doing so switches the mode to "custom". The layout is stored on the user
 * entity via base44.auth.updateMe({ dashboard_layout, dashboard_mode }).
 */

export const SECTION_KEYS = [
  'hero',
  'payday_planner',
  'upcoming_commitments',
  'things_to_know',
  'annual_payments',
  'goals_funds',
  'budgeting',
  'debt',
  'forecast',
  'income_breakdown',
  'period_comparison',
  'pay_periods',
  'full_insights',
];

export const SECTION_LABELS = {
  hero: 'Overview',
  payday_planner: 'Payday Planner',
  upcoming_commitments: 'Upcoming Commitments',
  things_to_know: 'Things to Know',
  annual_payments: 'Annual Payment Savings',
  goals_funds: 'Goals & Funds',
  budgeting: 'Budgeting Rule',
  debt: 'Debt',
  forecast: '12 Month Forecast',
  income_breakdown: 'Income Breakdown',
  period_comparison: 'Period Comparison',
  pay_periods: 'Higher Income Periods',
  full_insights: 'Insights',
};

export const DASHBOARD_MODES = ['simple', 'planning', 'detailed'];

export const MODE_LABELS = {
  simple: 'Simple',
  planning: 'Planning',
  detailed: 'Detailed',
  custom: 'Custom',
};

export const MODE_PRESETS = {
  simple: {
    order: ['hero', 'payday_planner', 'upcoming_commitments', 'things_to_know', 'annual_payments', 'goals_funds', 'budgeting', 'debt', 'forecast'],
    hidden: ['income_breakdown', 'period_comparison', 'pay_periods', 'full_insights'],
  },
  planning: {
    order: ['hero', 'payday_planner', 'upcoming_commitments', 'things_to_know', 'annual_payments', 'goals_funds', 'budgeting', 'debt', 'forecast', 'income_breakdown', 'period_comparison'],
    hidden: ['pay_periods', 'full_insights'],
  },
  detailed: {
    order: [...SECTION_KEYS],
    hidden: [],
  },
};

export const DEFAULT_MODE = 'simple';

// Maps retired section keys to their replacements so old saved layouts migrate.
const KEY_MIGRATION = {
  left_after_bills: 'hero',
  safe_to_spend: 'hero',
  savings: 'goals_funds',
  emergency_fund: 'goals_funds',
  sinking_funds: 'goals_funds',
};

/**
 * Resolve a saved layout + mode into the active { order, hidden }.
 * Preset modes return their preset directly; custom/legacy layouts are
 * migrated and appended with any new keys.
 */
export function resolveLayout(savedLayout, savedMode) {
  if (savedMode && MODE_PRESETS[savedMode]) {
    return MODE_PRESETS[savedMode];
  }

  if (savedLayout && Array.isArray(savedLayout.order)) {
    const known = new Set(SECTION_KEYS);
    let order = savedLayout.order
      .map(k => KEY_MIGRATION[k] || k)
      .filter(k => known.has(k));
    order = [...new Set(order)];
    SECTION_KEYS.forEach(k => { if (!order.includes(k)) order.push(k); });
    let hidden = (savedLayout.hidden || [])
      .map(k => KEY_MIGRATION[k] || k)
      .filter(k => known.has(k) && order.includes(k));
    hidden = [...new Set(hidden)];
    return { order, hidden };
  }

  return MODE_PRESETS.simple;
}

/**
 * Return visible section keys in display order.
 */
export function getVisibleSections(layout) {
  return layout.order.filter(k => !layout.hidden.includes(k));
}