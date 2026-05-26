import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const [form, setForm] = useState({
    monthly_income: '',
    pay_frequency: 'monthly',
    pay_day: '',
    currency: '£',
  });

  useEffect(() => {
    if (user) {
      setForm({
        monthly_income: user.monthly_income || '',
        pay_frequency: user.pay_frequency || 'monthly',
        pay_day: user.pay_day || '',
        currency: user.currency || '£',
      });
    }
  }, [user]);

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