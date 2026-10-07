/**
 * Dashboard section definitions and layout resolution.
 *
 * Users can toggle section visibility and reorder sections. The layout is
 * stored on the user entity via base44.auth.updateMe({ dashboard_layout }).
 * New sections added here are automatically appended to existing layouts.
 */

export const SECTION_KEYS = [
  'left_after_bills',
  'safe_to_spend',
  'things_to_know',
  'upcoming_commitments',
  'payday_planner',
  'savings',
  'emergency_fund',
  'sinking_funds',
  'debt',
  'forecast',
];

export const SECTION_LABELS = {
  left_after_bills: 'Left After Bills',
  safe_to_spend: 'Safe to Spend',
  things_to_know: 'Things to Know',
  upcoming_commitments: 'Upcoming Commitments',
  payday_planner: 'Payday Planner',
  savings: 'Savings',
  emergency_fund: 'Emergency Fund',
  sinking_funds: 'Sinking Funds',
  debt: 'Debt',
  forecast: 'Forecast',
};

export const DEFAULT_LAYOUT = {
  order: [...SECTION_KEYS],
  hidden: [],
};

/**
 * Resolve a saved layout, appending any new sections not yet known to the user.
 */
export function resolveLayout(saved) {
  if (!saved || !Array.isArray(saved.order)) {
    return { order: [...SECTION_KEYS], hidden: [] };
  }
  const known = new Set(SECTION_KEYS);
  const order = saved.order.filter(k => known.has(k));
  SECTION_KEYS.forEach(k => { if (!order.includes(k)) order.push(k); });
  const hidden = (saved.hidden || []).filter(k => known.has(k) && order.includes(k));
  return { order, hidden };
}

/**
 * Return visible section keys in display order.
 */
export function getVisibleSections(layout) {
  return layout.order.filter(k => !layout.hidden.includes(k));
}