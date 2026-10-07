import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { deleteAllUserData } from '../../shared/userData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only ever deletes records where created_by_id === user.id, so no other
    // user's data can ever be touched, regardless of role.
    const summary = await deleteAllUserData(base44, user.id);

    return Response.json({ success: true, deleted: summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}