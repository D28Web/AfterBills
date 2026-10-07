// Shared helpers for admin backend functions. Keeps admin authorization,
// per-user aggregation, and audit-log writing in one place so every admin
// function enforces access the same way.

// Returns true if the user may perform administrative actions.
export function isAdmin(user) {
  return !!user && (user.role === 'admin' || user.role === 'owner');
}

// Authorization guard for admin backend functions. Returns { authorized: true }
// or { authorized: false, response } where `response` is a 401/403 to return.
export function adminGuard(user) {
  if (!user) {
    return {
      authorized: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!isAdmin(user)) {
    return {
      authorized: false,
      response: Response.json({ error: 'Forbidden: administrator access required' }, { status: 403 }),
    };
  }
  return { authorized: true };
}

// Per-user counts across user-owned entities, plus the latest bill created_date
// per user (used as a "last activity" signal). Returns a map of
// { [userId]: { bills, savings_goals, trips, income_streams, last_bill_date } }.
export async function getUserCounts(base44) {
  const [billAgg, goalAgg, tripAgg, incomeAgg] = await Promise.all([
    base44.asServiceRole.entities.Bill.aggregate({ groupBy: 'created_by_id', count: true, max: 'created_date' }),
    base44.asServiceRole.entities.SavingsGoal.aggregate({ groupBy: 'created_by_id', count: true }),
    base44.asServiceRole.entities.Trip.aggregate({ groupBy: 'created_by_id', count: true }),
    base44.asServiceRole.entities.IncomeStream.aggregate({ groupBy: 'created_by_id', count: true }),
  ]);

  const map = {};
  const ensure = (id) => {
    if (!map[id]) map[id] = { bills: 0, savings_goals: 0, trips: 0, income_streams: 0, last_bill_date: null };
    return map[id];
  };

  (billAgg.rows || []).forEach((r) => {
    if (!r.created_by_id) return;
    const e = ensure(r.created_by_id);
    e.bills = r.count || 0;
    e.last_bill_date = r.max_created_date || null;
  });
  (goalAgg.rows || []).forEach((r) => {
    if (!r.created_by_id) return;
    ensure(r.created_by_id).savings_goals = r.count || 0;
  });
  (tripAgg.rows || []).forEach((r) => {
    if (!r.created_by_id) return;
    ensure(r.created_by_id).trips = r.count || 0;
  });
  (incomeAgg.rows || []).forEach((r) => {
    if (!r.created_by_id) return;
    ensure(r.created_by_id).income_streams = r.count || 0;
  });

  return map;
}

// Write an immutable audit-log entry via the service role. Failures are logged
// but never block the administrative action that triggered them.
export async function writeAuditLog(base44, entry) {
  try {
    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_id: entry.admin_id,
      admin_email: entry.admin_email || '',
      action: entry.action,
      target_type: entry.target_type || 'user',
      target_id: entry.target_id,
      target_email: entry.target_email || '',
      metadata: entry.metadata || {},
    });
  } catch (e) {
    console.error('Audit log write failed:', e?.message || e);
  }
}