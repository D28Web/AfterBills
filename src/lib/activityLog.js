import { base44 } from '@/api/base44Client';

export const ACTIVITY_ACTIONS = {
  bill_created: { label: 'Bill Created', itemType: 'bill' },
  bill_amount_changed: { label: 'Bill Amount Changed', itemType: 'bill' },
  bill_ended: { label: 'Bill Ended', itemType: 'bill' },
  income_changed: { label: 'Income Changed', itemType: 'income' },
  savings_target_changed: { label: 'Savings Target Changed', itemType: 'savings_goal' },
  sinking_fund_contribution: { label: 'Sinking Fund Contribution', itemType: 'sinking_fund' },
  debt_updated: { label: 'Debt Updated', itemType: 'debt' },
  scenario_applied: { label: 'Scenario Applied', itemType: 'scenario' },
};

// Log a meaningful financial activity. Silent on failure — activity logging
// must never break the user's primary flow.
export async function logActivity(action, itemType, itemName, description) {
  try {
    await base44.entities.ActivityLog.create({
      action,
      item_type: itemType,
      item_name: itemName || '',
      description,
    });
  } catch (e) {
    // silent
  }
}