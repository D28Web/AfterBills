// User-owned AfterBills entities, in dependency order (children before parents)
// so deletion never leaves orphaned records. `key` is the export JSON field name.
export const USER_ENTITIES = [
  { name: 'BillSubcategory', key: 'bill_subcategories' },
  { name: 'TripExpense', key: 'trip_expenses' },
  { name: 'TripContribution', key: 'trip_contributions' },
  { name: 'Trip', key: 'trips' },
  { name: 'SavingsGoal', key: 'savings_goals' },
  { name: 'IncomeStream', key: 'income_streams' },
  { name: 'Bill', key: 'bills' },
];

// Fetch every record belonging to userId across all user-owned entities.
// An explicit created_by_id filter guarantees the result is scoped to the
// authenticated user — independent of RLS, and safe even for admin users.
export async function fetchAllUserData(base44, userId) {
  const out = {};
  await Promise.all(USER_ENTITIES.map(async (e) => {
    const query = { created_by_id: userId };
    let items = [];
    let cursor = undefined;
    let hasMore = true;
    while (hasMore) {
      const page = await base44.entities[e.name].filter(query, { limit: 1000, cursor });
      items = items.concat(page.items || []);
      cursor = page.next_cursor;
      hasMore = !!page.has_more && !!cursor;
    }
    out[e.key] = items;
  }));
  return out;
}

// Permanently delete every record belonging to userId across all user-owned
// entities. IDs are fetched first, then deleted in batches by explicit id
// lists, so the operation only ever touches the authenticated user's records.
export async function deleteAllUserData(base44, userId) {
  const summary = {};
  for (const e of USER_ENTITIES) {
    const query = { created_by_id: userId };
    let ids = [];
    let cursor = undefined;
    let hasMore = true;
    while (hasMore) {
      const page = await base44.entities[e.name].filter(query, { limit: 1000, cursor, fields: ['id'] });
      ids = ids.concat((page.items || []).map(r => r.id));
      cursor = page.next_cursor;
      hasMore = !!page.has_more && !!cursor;
    }
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      await base44.entities[e.name].deleteMany({ id: { $in: batch } });
      deleted += batch.length;
    }
    summary[e.key] = deleted;
  }
  return summary;
}