import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard, getUserCounts } from '../../shared/adminData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => ({}));
    const search = (body.search || '').trim().toLowerCase();
    const sort = body.sort || 'created_date_desc';
    const page = Math.max(1, body.page || 1);
    const pageSize = Math.min(100, body.pageSize || 20);

    const [usersRaw, counts] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 1000),
      getUserCounts(base44),
    ]);

    let users = Array.isArray(usersRaw) ? usersRaw : (usersRaw.items || []);
    if (search) {
      users = users.filter(
        (u) =>
          (u.email || '').toLowerCase().includes(search) ||
          (u.full_name || '').toLowerCase().includes(search) ||
          (u.id || '').toLowerCase().includes(search)
      );
    }

    users = users.map((u) => {
      const c = counts[u.id] || { bills: 0, savings_goals: 0, trips: 0, income_streams: 0, last_bill_date: null };
      return {
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role || 'user',
        account_status: u.account_status || 'active',
        created_date: u.created_date,
        updated_date: u.updated_date,
        last_activity: c.last_bill_date || u.updated_date || null,
        onboarded: c.income_streams > 0,
        counts: { bills: c.bills, savings_goals: c.savings_goals, trips: c.trips, income_streams: c.income_streams },
      };
    });

    const sorters = {
      created_date_desc: (a, b) => (b.created_date || '').localeCompare(a.created_date || ''),
      created_date_asc: (a, b) => (a.created_date || '').localeCompare(b.created_date || ''),
      email_asc: (a, b) => (a.email || '').localeCompare(b.email || ''),
      email_desc: (a, b) => (b.email || '').localeCompare(a.email || ''),
      bills_desc: (a, b) => b.counts.bills - a.counts.bills,
    };
    users.sort(sorters[sort] || sorters.created_date_desc);

    const total = users.length;
    const start = (page - 1) * pageSize;
    const paged = users.slice(start, start + pageSize);

    return Response.json({ items: paged, total, page, pageSize, has_more: start + pageSize < total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}