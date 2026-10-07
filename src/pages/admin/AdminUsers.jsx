import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RoleBadge from '@/components/admin/RoleBadge';
import StatusBadge from '@/components/admin/StatusBadge';

const SORT_OPTIONS = [
  { value: 'created_date_desc', label: 'Newest first' },
  { value: 'created_date_asc', label: 'Oldest first' },
  { value: 'email_asc', label: 'Email A–Z' },
  { value: 'email_desc', label: 'Email Z–A' },
  { value: 'bills_desc', label: 'Most bills' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('created_date_desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('admin_list_users', { search, sort, page, pageSize });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, sort, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-slate-900">User management</h1>
        <p className="text-sm text-slate-500 mt-1">{total} registered {total === 1 ? 'user' : 'users'}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={onSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, email or ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-white"
          />
        </form>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48 bg-white"><ArrowUpDown className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Onboarded</th>
                <th className="px-4 py-3 font-medium text-center">Bills</th>
                <th className="px-4 py-3 font-medium text-center">Goals</th>
                <th className="px-4 py-3 font-medium text-center">Trips</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No users found</td></tr>
              )}
              {!loading && items.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.full_name || '—'}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.account_status} /></td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(u.created_date)}</td>
                  <td className="px-4 py-3">
                    {u.onboarded
                      ? <span className="text-emerald-600 text-xs font-medium">Yes</span>
                      : <span className="text-slate-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{u.counts.bills}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{u.counts.savings_goals}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{u.counts.trips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}