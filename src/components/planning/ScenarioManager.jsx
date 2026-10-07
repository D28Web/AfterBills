import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, FolderOpen, Trash2, CheckCircle2, FlaskConical, ShieldCheck, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const TYPE_META = {
  what_if: { label: 'What If', icon: FlaskConical },
  affordability: { label: 'Affordability', icon: ShieldCheck },
  purchase: { label: 'Large Purchase', icon: ShoppingBag },
};

function describeScenario(scenario) {
  if (scenario.type === 'what_if') {
    const d = scenario.data || {};
    const parts = [];
    if (d.extraBills?.length) parts.push(`add ${d.extraBills.length} bill(s)`);
    if (d.removedBillNames?.length) parts.push(`remove ${d.removedBillNames.length} bill(s)`);
    if (d.amountOverridesByName && Object.keys(d.amountOverridesByName).length) parts.push(`update ${Object.keys(d.amountOverridesByName).length} amount(s)`);
    return parts.join(', ') || 'income-only simulation';
  }
  if (scenario.type === 'affordability') {
    const c = scenario.data?.commitment;
    return c ? `${c.name || 'commitment'} (${c.frequency})` : 'commitment';
  }
  if (scenario.type === 'purchase') {
    const p = scenario.data?.purchase;
    return p ? `${p.name || 'purchase'} by ${p.target_date || '—'}` : 'purchase';
  }
  return '';
}

export default function ScenarioManager({ onLoad, currency = '£' }) {
  const queryClient = useQueryClient();
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => base44.entities.Scenario.filter({}, { sort: '-created_date', limit: 100 }),
  });

  const applyMutation = useMutation({
    mutationFn: async (scenario) => {
      if (scenario.type === 'what_if') {
        const extra = scenario.data?.extraBills || [];
        await Promise.all(extra.map(b => base44.entities.Bill.create({
          name: b.name, amount: b.amount, start_date: b.start_date, category: b.category,
          frequency: b.frequency, is_recurring: true,
        })));
      } else if (scenario.type === 'affordability') {
        const c = scenario.data?.commitment;
        if (!c) return;
        await base44.entities.Bill.create({
          name: c.name, amount: c.amount, frequency: c.frequency, start_date: c.start_date,
          category: c.category || 'other', is_recurring: true,
        });
      } else if (scenario.type === 'purchase') {
        const p = scenario.data?.purchase;
        if (!p) return;
        await base44.entities.SinkingFund.create({
          name: p.name, target_amount: p.target_cost, target_date: p.target_date,
          current_amount: p.allocated || 0, contribution_frequency: 'monthly', status: 'active',
        });
      }
    },
    onSuccess: (_v, scenario) => {
      if (scenario.type === 'purchase') queryClient.invalidateQueries({ queryKey: ['sinking-funds'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Scenario applied to your live data');
    },
    onError: () => toast.error('Could not apply scenario — please try again'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Scenario.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenarios'] }),
    onError: () => toast.error('Could not delete scenario'),
  });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold font-heading mb-1 flex items-center gap-2">
          <Save className="w-4 h-4 text-primary" /> Saved Scenarios
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Scenarios are plans only — they never change your live data automatically. Use Apply to write a scenario into your bills or sinking funds, with a preview first.</p>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : scenarios.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved scenarios yet. Build a plan in any tab and click Save to store it here.</p>
        ) : (
          <div className="space-y-2">
            {scenarios.map(s => {
              const meta = TYPE_META[s.type] || TYPE_META.what_if;
              const Icon = meta.icon;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {meta.label} · {describeScenario(s)}
                    </p>
                    {s.created_date && (
                      <p className="text-[10px] text-muted-foreground">{format(new Date(s.created_date), 'd MMM yyyy')}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onLoad(s)}>
                      <FolderOpen className="w-3 h-3" /> Load
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="h-8 text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Apply
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apply "{s.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {s.type === 'what_if' && `This will create ${s.data?.extraBills?.length || 0} new bill(s) in your live bills list.`}
                            {s.type === 'affordability' && `This will create a new bill "${s.data?.commitment?.name}" (${s.data?.commitment?.frequency}) in your live bills list.`}
                            {s.type === 'purchase' && `This will create a sinking fund "${s.data?.purchase?.name}" with target ${currency}${s.data?.purchase?.target_cost}.`}
                            {' '}This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => applyMutation.mutate(s)} disabled={applyMutation.isPending}>
                            {applyMutation.isPending ? 'Applying...' : 'Apply to live data'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}