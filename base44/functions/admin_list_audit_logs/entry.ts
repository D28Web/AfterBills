import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard } from '../../shared/adminData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(200, body.limit || 200);

    const logs = await base44.asServiceRole.entities.AdminAuditLog.filter(
      {},
      { sort: '-created_date', limit }
    );

    const items = (logs.items || []).map((l) => ({
      id: l.id,
      timestamp: l.created_date,
      admin_email: l.admin_email,
      action: l.action,
      target_email: l.target_email,
      target_id: l.target_id,
    }));

    return Response.json({ items, total: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}