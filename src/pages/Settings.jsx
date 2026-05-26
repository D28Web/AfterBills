import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import IncomeStreamForm from '@/components/income/IncomeStreamForm';
import IncomeStreamCard from '@/components/income/IncomeStreamCard';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const [form, setForm] = useState({
    monthly_income: '',
    pay_frequency: 'monthly',
    pay_day: '',
    pay_start_date: '',
    currency: '£',
  });

  const [showAddStream, setShowAddStream] = useState(false);
  const [editingStream, setEditingStream] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        monthly_income: user.monthly_income || '',
        pay_frequency: user.pay_frequency || 'monthly',
        pay_day: user.pay_day || '',
        pay_start_date: user.pay_start_date || '',
        currency: user.currency || '£',
      });
    }
  }, [user]);

  const { data: incomeStreams = [] } = useQuery({
    queryKey: ['income-streams'],
    queryFn: () => base44.entities.IncomeStream.list(),
  });

  const createStream = useMutation({
    mutationFn: (data) => base44.entities.IncomeStream.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['income-streams'] }); setShowAddStream(false); toast.success('Income stream added'); },
  });

  const updateStream = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IncomeStream.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['income-streams'] }); setEditingStream(null); toast.success('Income stream updated'); },
  });

  const deleteStream = useMutation({
    mutationFn: (id) => base44.entities.IncomeStream.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['income-streams'] }); toast.success('Income stream deleted'); },
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Settings saved');
    },
  });

  const handleSave = () => {
    mutation.mutate({
      monthly_income: parseFloat(form.monthly_income) || 0,
      pay_frequency: form.pay_frequency,
      pay_day: parseInt(form.pay_day) || 1,
      pay_start_date: form.pay_start_date || null,
      currency: form.currency,
    });
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your income and preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6 space-y-5"
      >
        <h3 className="text-sm font-semibold font-heading">Income Details</h3>

        <div>
          <Label>Monthly Income</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g. 2500"
            value={form.monthly_income}
            onChange={e => setForm({ ...form, monthly_income: e.target.value })}
          />
        </div>

        <div>
          <Label>Pay Frequency</Label>
          <Select value={form.pay_frequency} onValueChange={v => setForm({ ...form, pay_frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="four_weekly">Four-weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pay Day (day of month)</Label>
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 25"
            value={form.pay_day}
            onChange={e => setForm({ ...form, pay_day: e.target.value })}
          />
        </div>

        <div>
          <Label>Pay Start Date</Label>
          <Input
            type="date"
            value={form.pay_start_date}
            onChange={e => setForm({ ...form, pay_start_date: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">The date your income started — used to anchor quarterly/annual cycles.</p>
        </div>

        <div>
          <Label>Currency Symbol</Label>
          <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="£">£ GBP</SelectItem>
              <SelectItem value="$">$ USD</SelectItem>
              <SelectItem value="€">€ EUR</SelectItem>
              <SelectItem value="A$">A$ AUD</SelectItem>
              <SelectItem value="C$">C$ CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2 w-full">
          <Save className="w-4 h-4" /> Save Settings
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-heading">Other Income Streams</h3>
          {!showAddStream && !editingStream && (
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowAddStream(true)}>
              <Plus className="w-3 h-3" />Add
            </Button>
          )}
        </div>

        {showAddStream && (
          <IncomeStreamForm
            onSubmit={(data) => createStream.mutate(data)}
            onCancel={() => setShowAddStream(false)}
          />
        )}

        <div>
          {incomeStreams.map(stream => (
            editingStream?.id === stream.id ? (
              <IncomeStreamForm
                key={stream.id}
                stream={stream}
                onSubmit={(data) => updateStream.mutate({ id: stream.id, data })}
                onCancel={() => setEditingStream(null)}
              />
            ) : (
              <IncomeStreamCard
                key={stream.id}
                stream={stream}
                currency={form.currency || '£'}
                onEdit={setEditingStream}
                onDelete={(s) => deleteStream.mutate(s.id)}
              />
            )
          ))}
          {incomeStreams.length === 0 && !showAddStream && (
            <p className="text-sm text-muted-foreground text-center py-3">No additional income streams yet</p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h3 className="text-sm font-semibold font-heading mb-1">Account</h3>
        <p className="text-xs text-muted-foreground mb-4">{user?.email}</p>
        <Button variant="outline" className="gap-2 text-destructive" onClick={() => base44.auth.logout()}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </motion.div>
    </div>
  );
}