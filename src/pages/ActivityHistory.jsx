import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ACTIVITY_ACTIONS } from '@/lib/activityLog';
import {
  Receipt, TrendingUp, CalendarX, Wallet, Target, PiggyBank,
  CreditCard, FlaskConical, History,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';

const ACTION_ICONS = {
  bill_created: Receipt,
  bill_amount_changed: TrendingUp,
  bill_ended: CalendarX,
  income_changed: Wallet,
  savings_target_changed: Target,
  sinking_fund_contribution: PiggyBank,
  debt_updated: CreditCard,
  scenario_applied: FlaskConical,
};

export default function ActivityHistory() {
  const [filterAction, setFilterAction] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const query = {};
  if (filterAction !== 'all') query.action = filterAction;
  if (filterFrom || filterTo) {
    query.created_date = {};
    if (filterFrom) query.created_date.$gte = filterFrom;
    if (filterTo) query.created_date.$lte = filterTo;
  }

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs', filterAction, filterFrom, filterTo],
    queryFn: async () => {
      const res = await base44.entities.ActivityLog.filter(query, { sort: '-created_date', limit: 200 });
      return Array.isArray(res) ? res : (res.items || []);
    },
  });

  const hasFilters = filterAction !== 'all' || !!filterFrom || !!filterTo;

  const handleClear = () => {
    setFilterAction('all');
    setFilterFrom('');
    setFilterTo('');
  };

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader title="Activity History" subtitle="A log of meaningful financial changes you've made" />

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Activity Type</label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activities</SelectItem>
                {Object.entries(ACTIVITY_ACTIONS).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
            <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
            <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs h-7">Clear filters</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">{hasFilters ? 'No activities match your filters' : 'No activity yet'}</p>
          <p className="text-sm mt-1">{hasFilters ? 'Try adjusting your filters' : 'Financial changes will appear here as you make them'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const Icon = ACTION_ICONS[log.action] || History;
            const meta = ACTIVITY_ACTIONS[log.action] || {};
            return (
              <div key={log.id} className="flex items-start gap-3 bg-card rounded-xl border border-border p-4">
                <div className="p-2 rounded-lg bg-accent shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{meta.label || log.action}</span>
                    {log.item_name && <span className="text-sm text-muted-foreground">· {log.item_name}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{log.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap hidden sm:block">
                  {log.created_date ? format(new Date(log.created_date), 'd MMM yyyy, HH:mm') : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}