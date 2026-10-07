import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard, getUserCounts, writeAuditLog } from '../../shared/adminData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => ({}));
    const targetId = body.user_id;
    const includeFinancial = !!body.include_financial;
    if (!targetId) return Response.json({ error: 'user_id required' }, { status: 400 });

    const [tu, counts] = await Promise.all([
      base44.asServiceRole.entities.User.get(targetId),
      getUserCounts(base44),
    ]);
    if (!tu || !tu.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const c = counts[targetId] || { bills: 0, savings_goals: 0, trips: 0, income_streams: 0, last_bill_date: null };

    const result = {
      id: tu.id,
      email: tu.email,
      full_name: tu.full_name,
      role: tu.role || 'user',
      account_status: tu.account_status || 'active',
      currency: tu.currency || '£',
      created_date: tu.created_date,
      updated_date: tu.updated_date,
      last_activity: c.last_bill_date || tu.updated_date || null,
      onboarded: c.income_streams > 0,
      counts: { bills: c.bills, savings_goals: c.savings_goals, trips: c.trips, income_streams: c.income_streams },
    };

    if (includeFinancial) {
      const [bills, goals, trips, income] = await Promise.all([
        base44.asServiceRole.entities.Bill.filter({ created_by_id: targetId }, { limit: 100, sort: '-created_date' }),
        base44.asServiceRole.entities.SavingsGoal.filter({ created_by_id: targetId }, { limit: 100, sort: '-created_date' }),
        base44.asServiceRole.entities.Trip.filter({ created_by_id: targetId }, { limit: 100, sort: '-created_date' }),
        base44.asServiceRole.entities.IncomeStream.filter({ created_by_id: targetId }, { limit: 50, sort: '-created_date' }),
      ]);
      result.financial = {
        bills: (bills.items || []).map((b) => ({
          id: b.id, name: b.name, amount: b.amount, category: b.category,
          frequency: b.frequency, is_split: b.is_split, split_between: b.split_between,
          created_date: b.created_date,
        })),
        savings_goals: (goals.items || []).map((g) => ({
          id: g.id, name: g.name, target_amount: g.target_amount,
          current_amount: g.current_amount, created_date: g.created_date,
        })),
        trips: (trips.items || []).map((t) => ({
          id: t.id, name: t.name, target_date: t.target_date, created_date: t.created_date,
        })),
        income_streams: (income.items || []).map((i) => ({
          id: i.id, name: i.name, amount: i.amount, frequency: i.frequency,
          income_mode: i.income_mode, is_primary: i.is_primary, created_date: i.created_date,
        })),
      };
      await writeAuditLog(base44, {
        admin_id: user.id, admin_email: user.email,
        action: 'view_account_financial',
        target_id: targetId, target_email: tu.email,
        metadata: { include_financial: true },
      });
    } else {
      await writeAuditLog(base44, {
        admin_id: user.id, admin_email: user.email,
        action: 'view_account_detail',
        target_id: targetId, target_email: tu.email,
        metadata: {},
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}