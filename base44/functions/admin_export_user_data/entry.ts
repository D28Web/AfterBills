import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard, writeAuditLog } from '../../shared/adminData.js';
import { fetchAllUserData } from '../../shared/userData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => ({}));
    const targetId = body.user_id;
    if (!targetId) return Response.json({ error: 'user_id required' }, { status: 400 });

    const tu = await base44.asServiceRole.entities.User.get(targetId);
    if (!tu || !tu.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const entities = await fetchAllUserData(base44.asServiceRole, targetId);
    const exportData = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: { id: user.id, email: user.email, role: user.role },
      app: 'AfterBills',
      user: {
        id: tu.id,
        email: tu.email,
        full_name: tu.full_name,
        role: tu.role,
        currency: tu.currency || '£',
        account_status: tu.account_status || 'active',
        created_date: tu.created_date,
      },
      entities,
    };

    await writeAuditLog(base44, {
      admin_id: user.id, admin_email: user.email,
      action: 'export_account_data',
      target_id: targetId, target_email: tu.email,
      metadata: {
        record_counts: Object.fromEntries(
          Object.entries(entities).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        ),
      },
    });

    return Response.json(exportData);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}