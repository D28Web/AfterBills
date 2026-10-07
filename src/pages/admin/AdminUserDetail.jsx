import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt, Target, Plane, Wallet, ShieldAlert, Download, Trash2, Eye, EyeOff, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import RoleBadge from '@/components/admin/RoleBadge';
import StatusBadge from '@/components/admin/StatusBadge';
import { formatMoney } from '@/lib/money';
import { useToast } from '@/components/ui/use-toast';

const FREQ_LABELS = { weekly: 'Weekly', fortnightly: 'Fortnightly', four_weekly: 'Four-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFinancial, setShowFinancial] = useState(false);
  const [financial, setFinancial] = useState(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('admin_get_user', { user_id: id });
      setUser(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const toggleFinancial = async () => {
    if (showFinancial) { setShowFinancial(false); return; }
    setLoadingFinancial(true);
    try {
      const res = await base44.functions.invoke('admin_get_user', { user_id: id, include_financial: true });
      setFinancial(res.data.financial);
      setShowFinancial(true);
    } catch (e) {
      toast({ title: 'Failed to load financial details', description: e?.message, variant: 'destructive' });
    } finally {
      setLoadingFinancial(false);
    }
  };

  const setStatus = async (status) => {
    setActionLoading(status);
    try {
      await base44.functions.invoke('admin_set_user_status', { user_id: id, status });
      toast({ title: `Account ${status === 'disabled' ? 'disabled' : 're-enabled'}` });
      await load();
    } catch (e) {
      toast({ title: 'Action failed', description: e?.response?.data?.error || e?.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const exportData = async () => {
    setActionLoading('export');
    try {
      const res = await base44.functions.invoke('admin_export_user_data', { user_id: id });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afterbills-user-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Account data exported' });
    } catch (e) {
      toast({ title: 'Export failed', description: e?.response?.data?.error || e?.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async () => {
    setActionLoading('delete');
    try {
      await base44.functions.invoke('admin_delete_user', { user_id: id });
      toast({ title: 'Account deleted' });
      navigate('/admin/users');
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.response?.data?.error || e?.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="p-8"><div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm mb-4">{error}</div>
        <Button variant="outline" onClick={() => navigate('/admin/users')} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to users</Button>
      </div>
    );
  }

  const isOwner = user.role === 'owner';
  const isDisabled = user.account_status === 'disabled';
  const currency = user.currency || '£';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">{user.full_name || 'Unnamed user'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.account_status} />
              {user.onboarded
                ? <span className="text-xs text-emerald-400 font-medium">Onboarded</span>
                : <span className="text-xs text-muted-foreground">Not onboarded</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={toggleFinancial} disabled={loadingFinancial} className="gap-2">
              {showFinancial ? <><EyeOff className="w-4 h-4" /> Hide financials</> : <><Eye className="w-4 h-4" /> View financials</>}
            </Button>
            <Button variant="outline" size="sm" onClick={exportData} disabled={actionLoading === 'export'} className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
            {isDisabled ? (
              <Button size="sm" onClick={() => setStatus('active')} disabled={actionLoading === 'active' || isOwner} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Power className="w-4 h-4" /> Re-enable
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setStatus('disabled')} disabled={actionLoading === 'disabled' || isOwner} className="gap-2 text-primary border-primary/20 hover:bg-primary/10">
                <Power className="w-4 h-4" /> Disable
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={actionLoading === 'delete' || isOwner} className="gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this account permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes all of {user.email}'s bills, income streams, savings goals and trips. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteUser} className="bg-red-600 hover:bg-red-700 text-white">Delete account</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {isOwner && (
          <p className="text-xs text-primary mt-4 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Owner accounts are protected and cannot be disabled or deleted.
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">User ID</p>
          <p className="text-sm font-mono text-foreground/80 mt-1 break-all">{user.id}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Registered</p>
          <p className="text-sm text-foreground/80 mt-1">{formatDate(user.created_date)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Last activity</p>
          <p className="text-sm text-foreground/80 mt-1">{formatDate(user.last_activity)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Currency</p>
          <p className="text-sm text-foreground/80 mt-1">{currency}</p>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Receipt className="w-4 h-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Bills</p><p className="text-lg font-bold text-foreground">{user.counts.bills}</p></div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-violet-500/15 rounded-lg"><Target className="w-4 h-4 text-violet-400" /></div>
          <div><p className="text-xs text-muted-foreground">Savings goals</p><p className="text-lg font-bold text-foreground">{user.counts.savings_goals}</p></div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-sky-500/15 rounded-lg"><Plane className="w-4 h-4 text-sky-400" /></div>
          <div><p className="text-xs text-muted-foreground">Trips</p><p className="text-lg font-bold text-foreground">{user.counts.trips}</p></div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-500/15 rounded-lg"><Wallet className="w-4 h-4 text-emerald-400" /></div>
          <div><p className="text-xs text-muted-foreground">Income streams</p><p className="text-lg font-bold text-foreground">{user.counts.income_streams}</p></div>
        </div>
      </div>

      {/* Financial details (only on explicit request) */}
      {showFinancial && financial && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 rounded-xl p-3 text-sm">
            <Eye className="w-4 h-4" /> Detailed financial view — this access is recorded in the audit log.
          </div>

          {financial.income_streams.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">Income streams</h3>
              <div className="space-y-2">
                {financial.income_streams.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{i.name}</span>
                      {i.is_primary && <span className="ml-2 text-xs text-emerald-400 font-medium">Primary</span>}
                      <p className="text-xs text-muted-foreground">{FREQ_LABELS[i.frequency] || i.frequency} · {i.income_mode === 'salary' ? 'Gross (UK tax)' : 'Net'}</p>
                    </div>
                    <span className="text-foreground/80">{i.income_mode === 'salary' ? '—' : formatMoney(i.amount, { currency, decimals: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {financial.bills.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">Bills</h3>
              <div className="space-y-2">
                {financial.bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{b.name}</span>
                      <p className="text-xs text-muted-foreground capitalize">{b.category} · {FREQ_LABELS[b.frequency] || b.frequency}{b.is_split ? ` · split /${b.split_between}` : ''}</p>
                    </div>
                    <span className="text-foreground/80">{formatMoney(b.amount, { currency, decimals: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {financial.savings_goals.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">Savings goals</h3>
              <div className="space-y-2">
                {financial.savings_goals.map((g) => (
                  <div key={g.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <span className="font-medium text-foreground">{g.name}</span>
                    <span className="text-foreground/80">{formatMoney(g.current_amount || 0, { currency, decimals: 2 })} / {formatMoney(g.target_amount, { currency, decimals: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {financial.trips.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">Trips</h3>
              <div className="space-y-2">
                {financial.trips.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <span className="text-muted-foreground text-xs">Target: {formatDate(t.target_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {financial.bills.length === 0 && financial.savings_goals.length === 0 && financial.trips.length === 0 && financial.income_streams.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">This user has no financial records.</p>
          )}
        </motion.div>
      )}
    </div>
  );
}