import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { adminGuard, writeAuditLog } from '../../shared/adminData.js';
import { deleteAllUserData } from '../../shared/userData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const guard = adminGuard(user);
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => ({}));
    const targetId = body.user_id;
    if (!targetId) return Response.json({ error: 'user_id required' }, { status: 400 });
    if (targetId === user.id) {
      return Response.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const tu = await base44.asServiceRole.entities.User.get(targetId);
    if (!tu || !tu.id) return Response.json({ error: 'User not found' }, { status: 404 });
    if (tu.role === 'owner') {
      return Response.json({ error: 'Owner accounts cannot be deleted' }, { status: 400 });
    }

    const summary = await deleteAllUserData(base44.asServiceRole, targetId);

    let userRecordDeleted = false;
    try {
      await base44.asServiceRole.entities.User.delete(targetId);
      userRecordDeleted = true;
    } catch (e) {
      // The platform may restrict User-record deletion; the user's data has
      // already been cleared regardless.
    }

    await writeAuditLog(base44, {
      admin_id: user.id, admin_email: user.email,
      action: 'delete_account',
      target_id: targetId, target_email: tu.email,
      metadata: { data_deleted: summary, user_record_deleted: userRecordDeleted },
    });

    return Response.json({ success: true, user_id: targetId, data_deleted: summary, user_record_deleted: userRecordDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}