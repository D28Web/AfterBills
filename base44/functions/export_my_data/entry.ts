import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fetchAllUserData } from '../../shared/userData.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entities = await fetchAllUserData(base44, user.id);

    const exportData = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      app: 'AfterBills',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        currency: user.currency || '£',
        // Legacy income preferences (pre-consolidation). After consolidation these
        // live in the primary IncomeStream record; included here so the export
        // captures the user's settings regardless of migration state.
        legacy_income: {
          monthly_income: user.monthly_income ?? null,
          pay_frequency: user.pay_frequency ?? null,
          pay_day: user.pay_day ?? null,
          pay_start_date: user.pay_start_date ?? null,
          pay_weekday: user.pay_weekday ?? null,
          income_mode: user.income_mode ?? null,
          tax_settings: user.tax_settings ?? null,
        },
      },
      entities,
    };

    return Response.json(exportData);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}