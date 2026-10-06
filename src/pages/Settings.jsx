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
import UKTaxSettings from '@/components/income/UKTaxSettings';
import { ukTaxBreakdown } from '@/lib/ukTax';
import { Switch } from '@/components/ui/switch';

const DEFAULT_TAX_SETTINGS = {
  grossAnnual: '',
  taxCode: '1257L',
  studentLoanPlan: 'none',
  pensionType: 'percent',
  pensionValue: '',
  pensionIsSalarySacrifice: false,
  salarySacrificeMonthly: '',
  otherDeductionsMonthly: '',
};

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const [form, setForm] = useState({
    monthly_income: '',
    pay_frequency: 'monthly',
    pay_day: '',
    pay_start_date: '',
    pay_weekday: 'none',
    currency: '£',
  });

  const [useStartDate, setUseStartDate] = useState(false);
  const [showAddStream, setShowAddStream] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [useUkTax, setUseUkTax] = useState(false);
  const [incomeMode, setIncomeMode] = useState('net');
  const [taxSettings, setTaxSettings] = useState(DEFAULT_TAX_SETTINGS);

  useEffect(() => {
    if (user) {
      const hasStartDate = !!user.pay_start_date;
      setUseStartDate(hasStartDate);
      const freq = user.pay_frequency || 'monthly';
      const freqToMonthly = { weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, four_weekly: 13 / 12, annually: 1 / 12 };
      const stored = user.monthly_income || 0;
      // Convert stored monthly back to per-frequency amount
      const perFreq = stored / (freqToMonthly[freq] || 1);
      setForm({
        monthly_income: perFreq ? perFreq.toFixed(2) : '',
        pay_frequency: freq,
        pay_day: user.pay_day || '',
        pay_start_date: user.pay_start_date || '',
        pay_weekday: user.pay_weekday || 'none',
        currency: user.currency || '£',
      });
      setIncomeMode(user.income_mode || 'net');
      setTaxSettings({ ...DEFAULT_TAX_SETTINGS, ...(user.tax_settings || {}) });
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

  const FREQ_TO_MONTHLY = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    monthly: 1,
    four_weekly: 13 / 12,
    annually: 1 / 12,
  };

  const FREQ_LABEL = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    four_weekly: 'Four-Weekly',
    annually: 'Annual',
  };

  const freqLabel = FREQ_LABEL[form.pay_frequency] || 'Monthly';
  const rawIncome = parseFloat(form.monthly_income) || 0;

  // For annually + UK tax, compute take-home first
  const ukBreakdown = (form.pay_frequency === 'annually' && useUkTax && rawIncome > 0)
    ? ukTaxBreakdown({ grossAnnual: rawIncome })
    : null;

  // Salary (before tax) mode: full UK tax breakdown from taxSettings
  const salaryBreakdown = (incomeMode === 'salary' && parseFloat(taxSettings.grossAnnual) > 0)
    ? ukTaxBreakdown({
        grossAnnual: parseFloat(taxSettings.grossAnnual),
        taxCode: taxSettings.taxCode,
        studentLoanPlan: taxSettings.studentLoanPlan,
        pensionType: taxSettings.pensionType,
        pensionValue: parseFloat(taxSettings.pensionValue) || 0,
        pensionIsSalarySacrifice: taxSettings.pensionIsSalarySacrifice,
        salarySacrificeAnnual: (parseFloat(taxSettings.salarySacrificeMonthly) || 0) * 12,
        otherDeductionsAnnual: (parseFloat(taxSettings.otherDeductionsMonthly) || 0) * 12,
      })
    : null;

  const monthlyEquivalent = incomeMode === 'salary'
    ? (salaryBreakdown ? salaryBreakdown.takeHomeMonthly : 0)
    : (ukBreakdown ? ukBreakdown.takeHomeMonthly : rawIncome * (FREQ_TO_MONTHLY[form.pay_frequency] || 1));

  // Only show monthly equivalent hint for weekly and fortnightly
  const showMonthlyHint = ['weekly', 'fortnightly'].includes(form.pay_frequency) && rawIncome > 0;

  const handleSave = () => {
    const isNonMonthly = ['weekly', 'fortnightly', 'four_weekly'].includes(form.pay_frequency);
    mutation.mutate({
      monthly_income: monthlyEquivalent,
      pay_frequency: form.pay_frequency,
      pay_day: (!isNonMonthly && !useStartDate) ? (parseInt(form.pay_day) || 1) : null,
      pay_start_date: (isNonMonthly || useStartDate) ? (form.pay_start_date || null) : null,
      pay_weekday: form.pay_weekday || 'none',
      currency: form.currency,
      income_mode: incomeMode,
      tax_settings: incomeMode === 'salary' ? taxSettings : null,
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
          <Label>Income Type</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIncomeMode('net')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${incomeMode === 'net' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'}`}>Take-home (net)</button>
            <button type="button" onClick={() => setIncomeMode('salary')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${incomeMode === 'salary' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'}`}>Salary before tax</button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{incomeMode === 'salary' ? 'Enter your gross annual salary — UK tax & NI estimated to give take-home.' : 'Enter what you actually receive each pay period.'}</p>
        </div>

        {incomeMode === 'net' && (
          <div>
            <Label>{freqLabel} Gross Income</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={form.pay_frequency === 'annually' ? 'e.g. 35000' : 'e.g. 2500'}
              value={form.monthly_income}
              onChange={e => setForm({ ...form, monthly_income: e.target.value })}
            />
            {showMonthlyHint && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {form.currency || '£'}{monthlyEquivalent.toFixed(2)} / month
              </p>
            )}
          </div>
        )}

        {incomeMode === 'salary' && (
          <UKTaxSettings
            taxSettings={taxSettings}
            onChange={setTaxSettings}
            payFrequency={form.pay_frequency}
            currency={form.currency || '£'}
          />
        )}

        {incomeMode === 'net' && form.pay_frequency === 'annually' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Apply UK Tax Calculation</Label>
                <p className="text-xs text-muted-foreground">Estimate take-home after Income Tax & NI (2024/25)</p>
              </div>
              <Switch checked={useUkTax} onCheckedChange={setUseUkTax} />
            </div>

            {useUkTax && ukBreakdown && (
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Annual</span>
                  <span>{form.currency || '£'}{ukBreakdown.grossAnnual.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-destructive/80">
                  <span>Income Tax</span>
                  <span>− {form.currency || '£'}{ukBreakdown.incomeTax.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-destructive/80">
                  <span>National Insurance</span>
                  <span>− {form.currency || '£'}{ukBreakdown.nationalInsurance.toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2 text-primary">
                  <span>Est. Monthly Take-Home</span>
                  <span>{form.currency || '£'}{ukBreakdown.takeHomeMonthly.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Estimate only. Does not account for pension, student loans, or other deductions.</p>
              </div>
            )}

            {!useUkTax && rawIncome > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {form.currency || '£'}{monthlyEquivalent.toFixed(2)} / month (gross)
              </p>
            )}
          </div>
        )}

        {/* Payday Rules */}
        <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/30">
          <p className="text-xs font-semibold text-foreground">Payday Rules</p>
          <div>
            <Label>Pay Frequency</Label>
            <Select value={form.pay_frequency} onValueChange={v => setForm({ ...form, pay_frequency: v, monthly_income: '' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="four_weekly">Four-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">How often you get paid — drives your payday schedule and per-cycle take-home.</p>
          </div>

          {['weekly', 'fortnightly', 'four_weekly'].includes(form.pay_frequency) ? (
            <>
              <div>
                <Label>First Known Payday</Label>
                <Input
                  type="date"
                  value={form.pay_start_date}
                  onChange={e => setForm({ ...form, pay_start_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">The exact date of a known payday — used as the anchor to generate all future paydays.</p>
              </div>
              <div>
                <Label>Usual Payday Weekday</Label>
                <Select value={form.pay_weekday} onValueChange={v => setForm({ ...form, pay_weekday: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific weekday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  If set, every generated payday will be snapped to this weekday. Example: every fourth Friday.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Usual Payday Rule</Label>
                <Select value={form.pay_weekday} onValueChange={v => setForm({ ...form, pay_weekday: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Specific date of month</SelectItem>
                    <SelectItem value="last_working_day">Last working day of month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.pay_weekday !== 'last_working_day' && (
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
              )}
            </>
          )}
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