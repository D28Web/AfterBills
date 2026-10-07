import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard, writeAuditLog } from '../../shared/adminData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => ({}));
    const targetId = body.user_id;
    const status = body.status;
    if (!targetId || !['active', 'disabled'].includes(status)) {
      return Response.json({ error: 'user_id and status (active|disabled) required' }, { status: 400 });
    }
    if (targetId === user.id) {
      return Response.json({ error: 'You cannot change your own account status' }, { status: 400 });
    }

    const tu = await base44.asServiceRole.entities.User.get(targetId);
    if (!tu || !tu.id) return Response.json({ error: 'User not found' }, { status: 404 });
    if (tu.role === 'owner') {
      return Response.json({ error: 'Owner accounts cannot be modified' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(targetId, { account_status: status });
    await writeAuditLog(base44, {
      admin_id: user.id, admin_email: user.email,
      action: status === 'disabled' ? 'disable_account' : 'enable_account',
      target_id: targetId, target_email: tu.email,
      metadata: { previous_status: tu.account_status || 'active', new_status: status },
    });

    return Response.json({ success: true, user_id: targetId, account_status: status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}