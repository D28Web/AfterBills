import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard, getUserCounts } from '../../shared/adminData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const [users, counts, recentLogs] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 1000),
      getUserCounts(base44),
      base44.asServiceRole.entities.AdminAuditLog.filter({}, { sort: '-created_date', limit: 10 }),
    ]);

    const usersArr = Array.isArray(users) ? users : (users.items || []);
    const now = Date.now();
    const within = (days) => {
      const cutoff = new Date(now - days * 86400000).toISOString();
      return usersArr.filter((u) => u.created_date && u.created_date >= cutoff).length;
    };

    const activeUserIds = new Set(
      Object.keys(counts).filter(
        (id) => counts[id].bills + counts[id].savings_goals + counts[id].trips + counts[id].income_streams > 0
      )
    );
    const onboardedIds = new Set(Object.keys(counts).filter((id) => counts[id].income_streams > 0));
    const disabledCount = usersArr.filter((u) => u.account_status === 'disabled').length;

    const totalBills = Object.values(counts).reduce((s, c) => s + c.bills, 0);
    const totalGoals = Object.values(counts).reduce((s, c) => s + c.savings_goals, 0);
    const totalTrips = Object.values(counts).reduce((s, c) => s + c.trips, 0);

    return Response.json({
      totals: {
        users: usersArr.length,
        active_users: activeUserIds.size,
        disabled_users: disabledCount,
        new_users_7d: within(7),
        new_users_30d: within(30),
        onboarded_users: onboardedIds.size,
        onboarding_rate: users.length ? Math.round((onboardedIds.size / users.length) * 100) : 0,
        bills: totalBills,
        savings_goals: totalGoals,
        trips: totalTrips,
      },
      recent_registrations: usersArr.slice(0, 5).map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || 'user',
        created_date: u.created_date,
        account_status: u.account_status || 'active',
      })),
      recent_activity: (recentLogs.items || []).map((l) => ({
        id: l.id,
        timestamp: l.created_date,
        admin_email: l.admin_email,
        action: l.action,
        target_email: l.target_email,
        target_id: l.target_id,
      })),
      health: {
        status: 'operational',
        server_time: new Date().toISOString(),
        user_list_capped: usersArr.length >= 1000,
        entities: { bills: totalBills, savings_goals: totalGoals, trips: totalTrips },
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}