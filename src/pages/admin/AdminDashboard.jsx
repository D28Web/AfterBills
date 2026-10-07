import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserPlus, Receipt, Target, Plane, Activity, HeartPulse, Clock } from 'lucide-react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import RoleBadge from '@/components/admin/RoleBadge';

const ACTION_LABELS = {
  view_account_detail: 'Viewed account',
  view_account_financial: 'Viewed financials',
  disable_account: 'Disabled account',
  enable_account: 'Enabled account',
  delete_account: 'Deleted account',
  export_account_data: 'Exported data',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('admin_get_dashboard', {});
        if (active) setData(res.data);
      } catch (e) {
        if (active) setError(e?.response?.data?.error || e?.message || 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>
      </div>
    );
  }

  const { totals, recent_registrations, recent_activity, health } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Application management and health at a glance</p>
      </div>

      {/* Users section */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Users</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="Total users" value={totals.users} icon={Users} accent="slate" />
        <AdminStatCard label="Active users" value={totals.active_users} sub="With at least one record" icon={UserCheck} accent="emerald" />
        <AdminStatCard label="New (7 days)" value={totals.new_users_7d} icon={UserPlus} accent="sky" />
        <AdminStatCard label="New (30 days)" value={totals.new_users_30d} icon={UserPlus} accent="sky" />
        <AdminStatCard label="Onboarded" value={totals.onboarded_users} sub={`${totals.onboarding_rate}% of total`} icon={UserCheck} accent="emerald" />
        <AdminStatCard label="Disabled" value={totals.disabled_users} icon={Users} accent="rose" />
      </div>

      {/* Content section */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Application content</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Total bills" value={totals.bills} icon={Receipt} accent="amber" />
        <AdminStatCard label="Savings goals" value={totals.savings_goals} icon={Target} accent="violet" />
        <AdminStatCard label="Trips" value={totals.trips} icon={Plane} accent="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent registrations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent registrations</h3>
          </div>
          <div className="space-y-3">
            {recent_registrations.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No registrations yet</p>
            )}
            {recent_registrations.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RoleBadge role={u.role} />
                  <span className="text-xs text-muted-foreground">{formatDate(u.created_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent admin activity */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent admin activity</h3>
          </div>
          <div className="space-y-3">
            {recent_activity.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No administrative actions yet</p>
            )}
            {recent_activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{ACTION_LABELS[a.action] || a.action}</p>
                  <p className="text-xs text-muted-foreground truncate">by {a.admin_email || '—'} on {a.target_email || '—'}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Health */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-8 mb-3">System health</h2>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/15 rounded-lg border border-emerald-500/20">
            <HeartPulse className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">{health.status}</p>
            <p className="text-xs text-muted-foreground">All admin services reachable</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Server time</p>
            <p className="font-medium text-foreground/80 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{formatDate(health.server_time)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bills tracked</p>
            <p className="font-medium text-foreground/80">{health.entities.bills}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Savings goals</p>
            <p className="font-medium text-foreground/80">{health.entities.savings_goals}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trips planned</p>
            <p className="font-medium text-foreground/80">{health.entities.trips}</p>
          </div>
        </div>
        {health.user_list_capped && (
          <p className="text-xs text-primary mt-3">Note: user list reached the page cap — counts reflect the most recent 1,000 users.</p>
        )}
      </motion.div>
    </div>
  );
}