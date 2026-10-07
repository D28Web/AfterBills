import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getAlerts } from '@/lib/alerts';
import { getActiveReminders } from '@/lib/reminders';
import {
  AlertOctagon, ShieldAlert, Receipt, CalendarClock, RefreshCw, TrendingUp,
  Target, PiggyBank, CreditCard, Bell, Info, AlertTriangle, X, Check, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const ICON_BY_TYPE = {
  negative_position: AlertOctagon,
  buffer_drop: ShieldAlert,
  expensive_cycle: Receipt,
  annual_bill: CalendarClock,
  renewal: RefreshCw,
  intro_price: TrendingUp,
  behind_goal: Target,
  behind_fund: PiggyBank,
  debt_milestone: CreditCard,
  scheduled_change: CalendarClock,
  reminder: Bell,
};

const PRIORITY_META = {
  important: {
    label: 'Important',
    icon: AlertOctagon,
    iconClass: 'text-red-600 dark:text-red-400',
    rowClass: 'bg-red-50/60 border-red-200/60 dark:bg-red-900/10 dark:border-red-800/30',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  attention: {
    label: 'Attention',
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    rowClass: 'bg-amber-50/60 border-amber-200/60 dark:bg-amber-900/10 dark:border-amber-800/30',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  information: {
    label: 'Information',
    icon: Info,
    iconClass: 'text-primary',
    rowClass: 'bg-primary/5 border-primary/20',
    badge: 'bg-primary/10 text-primary',
  },
};

export default function ThingsToKnow({
  bills = [],
  incomeStreams = [],
  sinkingFunds = [],
  goals = [],
  forecast = [],
  plannerData = [],
  buffer = 0,
  monthlySpare = 0,
  currency = '£',
}) {
  const queryClient = useQueryClient();

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.UserReminder.list(),
  });

  const { data: dismissed = [] } = useQuery({
    queryKey: ['dismissed-alerts'],
    queryFn: () => base44.entities.DismissedAlert.list(),
  });

  const dismissedKeys = useMemo(
    () => dismissed
      .filter(d => !d.expires_at || new Date(d.expires_at) >= new Date())
      .map(d => d.alert_key),
    [dismissed],
  );

  const items = useMemo(() => {
    const alerts = getAlerts({
      bills, incomeStreams, sinkingFunds, goals, forecast, plannerData,
      buffer, monthlySpare, currency, dismissedKeys,
    });
    const activeReminders = getActiveReminders({ reminders, bills, goals, sinkingFunds, currency });
    return [...alerts, ...activeReminders];
  }, [bills, incomeStreams, sinkingFunds, goals, forecast, plannerData, buffer, monthlySpare, currency, dismissedKeys, reminders]);

  const dismiss = useMutation({
    mutationFn: (alertKey) => base44.entities.DismissedAlert.create({ alert_key: alertKey }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dismissed-alerts'] }),
  });

  const applyIntroPrice = useMutation({
    mutationFn: ({ billId, newPrice, oldAmount, history }) => {
      const pctChange = oldAmount > 0 ? Math.round(((newPrice - oldAmount) / oldAmount) * 10000) / 100 : 0;
      const entry = {
        previous_amount: oldAmount,
        new_amount: newPrice,
        effective_date: new Date().toISOString().slice(0, 10),
        percentage_change: pctChange,
      };
      return base44.entities.Bill.update(billId, {
        amount: newPrice,
        intro_price_end_date: null,
        expected_new_price: null,
        amount_history: [...(history || []), entry],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dismissed-alerts'] });
    },
  });

  if (items.length === 0) return null;

  const grouped = { important: [], attention: [], information: [] };
  items.forEach(it => {
    const p = grouped[it.priority] ? it.priority : 'information';
    grouped[p].push(it);
  });
  const order = ['important', 'attention', 'information'].filter(p => grouped[p].length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <AlertTriangle className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading">Things to Know</h3>
            <p className="text-xs text-muted-foreground">Your most important current items</p>
          </div>
        </div>
        <Link to="/reminders">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
            <Settings2 className="w-3.5 h-3.5" /> Reminders
          </Button>
        </Link>
      </div>

      {order.map(priority => {
        const meta = PRIORITY_META[priority];
        return (
          <div key={priority} className="space-y-2">
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', meta.badge)}>
              <meta.icon className="w-3 h-3" /> {meta.label}
            </span>
            <div className="space-y-2">
              {grouped[priority].map(item => {
                const Icon = ICON_BY_TYPE[item.type] || Info;
                return (
                  <div key={item.key} className={cn('flex items-start gap-3 p-3 rounded-xl border', meta.rowClass)}>
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', meta.iconClass)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.action?.kind === 'apply_intro_price' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={applyIntroPrice.isPending}
                          onClick={() => applyIntroPrice.mutate({
                            billId: item.action.billId,
                            newPrice: item.action.newPrice,
                            oldAmount: item.action.oldAmount,
                            history: item.action.history,
                          })}
                        >
                          <Check className="w-3 h-3" /> Apply
                        </Button>
                      )}
                      {item.actionUrl && (
                        <Link to={item.actionUrl}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">View</Button>
                        </Link>
                      )}
                      {item.dismissible && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={dismiss.isPending}
                          onClick={() => dismiss.mutate(item.key)}
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}