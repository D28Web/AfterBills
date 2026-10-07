import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ACTION_LABELS = {
  view_account_detail: 'Viewed account',
  view_account_financial: 'Viewed financials',
  disable_account: 'Disabled account',
  enable_account: 'Enabled account',
  delete_account: 'Deleted account',
  export_account_data: 'Exported data',
};

const ACTION_STYLES = {
  view_account_detail: 'bg-muted text-muted-foreground',
  view_account_financial: 'bg-primary/15 text-primary',
  disable_account: 'bg-red-500/15 text-red-400',
  enable_account: 'bg-emerald-500/15 text-emerald-400',
  delete_account: 'bg-red-500/15 text-red-400',
  export_account_data: 'bg-sky-500/15 text-sky-400',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAuditLog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('admin_list_audit_logs', { limit: 200 });
        if (active) setItems(res.data.items || []);
      } catch (e) {
        if (active) setError(e?.response?.data?.error || e?.message || 'Failed to load audit log');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = items.filter((l) => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.admin_email || '').toLowerCase().includes(q) ||
      (l.target_email || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" /> Audit log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Immutable record of all administrative actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search admin, target or action…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="sm:w-52 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm mb-4">{error}</div>}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Administrator</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Affected user</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No audit entries found</td></tr>}
              {!loading && filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                  <td className="px-4 py-3 text-foreground/80">{l.admin_email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[l.action] || 'bg-muted text-muted-foreground'}`}>
                      {ACTION_LABELS[l.action] || l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.target_email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">Showing {filtered.length} of {items.length} entries. Audit entries are immutable and cannot be edited or deleted.</p>
      )}
    </div>
  );
}