import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import IncomeStreamForm from '@/components/income/IncomeStreamForm';
import IncomeStreamCard from '@/components/income/IncomeStreamCard';
import UKTaxSettings from '@/components/income/UKTaxSettings';
import IncomeChangesEditor from '@/components/income/IncomeChangesEditor';
import AccountDataSection from '@/components/settings/AccountDataSection';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { ukTaxBreakdown } from '@/lib/ukTax';
import { formatMoney, roundMoney } from '@/lib/money';
import { FREQUENCY_LABELS } from '@/lib/forecast';
import { Switch } from '@/components/ui/switch';
import { getOtherStreams, FREQ_TO_MONTHLY } from '@/lib/income';
import { cn } from '@/lib/utils';
import { useDisplayPeriod, DISPLAY_PERIOD_OPTIONS } from '@/lib/displayPeriod';
import { BUDGET_RULES, RULE_KEYS, DEFAULT_RULE } from '@/lib/budgeting';
import { logActivity } from '@/lib/activityLog';

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
    preferred_buffer: '',
  });

  const [useStartDate, setUseStartDate] = useState(false);
  const [showAddStream, setShowAddStream] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [useUkTax, setUseUkTax] = useState(false);
  const [incomeMode, setIncomeMode] = useState('net');
  const [taxSettings, setTaxSettings] = useState(DEFAULT_TAX_SETTINGS);
  const [primaryStreamId, setPrimaryStreamId] = useState(null);
  const [primaryChanges, setPrimaryChanges] = useState([]);
  const loadedRef = useRef(false);
  const [displayPeriod, setDisplayPeriod] = useDisplayPeriod(user);
  const [budgetingRule, setBudgetingRule] = useState(DEFAULT_RULE);

  useEffect(() => {
    if (user?.budgeting_rule) setBudgetingRule(user.budgeting_rule);
  }, [user?.budgeting_rule]);

  const handleRuleChange = (ruleKey) => {
    setBudgetingRule(ruleKey);
    base44.auth.updateMe({ budgeting_rule: ruleKey }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Budgeting rule updated');
    }).catch(() => toast.error('Could not update rule'));
  };

  const { data: incomeStreams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['income-streams'],
    queryFn: () => base44.entities.IncomeStream.list(),
  });

  useEffect(() => {
    if (!user || streamsLoading || loadedRef.current) return;
    loadedRef.current = true;
    const primary = incomeStreams.find(s => s.is_primary);
    if (primary) {
      setPrimaryStreamId(primary.id);
      setUseStartDate(!!primary.start_date);
      setForm({
        monthly_income: primary.amount ? String(primary.amount) : '',
        pay_frequency: primary.frequency || 'monthly',
        pay_day: primary.pay_day != null ? String(primary.pay_day) : '',
        pay_start_date: primary.start_date || '',
        pay_weekday: primary.pay_weekday || 'none',
        currency: user.currency || '£',
        preferred_buffer: user.preferred_buffer ? String(user.preferred_buffer) : '',
      });
      setIncomeMode(primary.income_mode || 'net');
      setTaxSettings({ ...DEFAULT_TAX_SETTINGS, ...(primary.tax_settings || {}) });
      setPrimaryChanges(primary.scheduled_changes || []);
    } else {
      // Legacy fallback: income still stored on the User entity
      setUseStartDate(!!user.pay_start_date);
      const freq = user.pay_frequency || 'monthly';
      const freqToMonthly = FREQ_TO_MONTHLY;
      const stored = user.monthly_income || 0;
      const perFreq = stored / (freqToMonthly[freq] || 1);
      setForm({
        monthly_income: perFreq ? perFreq.toFixed(2) : '',
        pay_frequency: freq,
        pay_day: user.pay_day != null ? String(user.pay_day) : '',
        pay_start_date: user.pay_start_date || '',
        pay_weekday: user.pay_weekday || 'none',
        currency: user.currency || '£',
        preferred_buffer: user.preferred_buffer ? String(user.preferred_buffer) : '',
      });
      setIncomeMode(user.income_mode || 'net');
      setTaxSettings({ ...DEFAULT_TAX_SETTINGS, ...(user.tax_settings || {}) });
      setPrimaryChanges([]);
    }
  }, [user, incomeStreams, streamsLoading]);

  const createStream = useMutation({
    mutationFn: (data) => base44.entities.IncomeStream.create(data),
    onSuccess: (_res, data) => {
      queryClient.invalidateQueries({ queryKey: ['income-streams'] });
      setShowAddStream(false);
      toast.success('Income stream added');
      logActivity('income_changed', 'income', data.name, `Added income stream "${data.name}"`);
    },
  });

  const updateStream = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IncomeStream.update(id, data),
    onSuccess: (_res, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['income-streams'] });
      setEditingStream(null);
      toast.success('Income stream updated');
      logActivity('income_changed', 'income', data.name, `Updated income stream "${data.name}"`);
    },
  });

  const deleteStream = useMutation({
    mutationFn: (id) => base44.entities.IncomeStream.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['income-streams'] }); toast.success('Income stream deleted'); },
  });

  const savePrimary = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.IncomeStream.update(id, data)
      : base44.entities.IncomeStream.create(data),
    onSuccess: (res, vars) => {
      if (!vars.id) setPrimaryStreamId(res.id);
      queryClient.invalidateQueries({ queryKey: ['income-streams'] });
      toast.success('Settings saved');
      logActivity('income_changed', 'income', vars.data.name, `Primary income ${vars.id ? 'updated' : 'set'} (${vars.data.frequency})`);
    },
  });

  const saveCurrency = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const freqLabel = FREQUENCY_LABELS[form.pay_frequency] || 'Monthly';
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
    : (ukBreakdown ? ukBreakdown.takeHomeMonthly : roundMoney(rawIncome * (FREQ_TO_MONTHLY[form.pay_frequency] || 1)));

  // Only show monthly equivalent hint for weekly and fortnightly
  const showMonthlyHint = ['weekly', 'fortnightly'].includes(form.pay_frequency) && rawIncome > 0;

  const handleSave = () => {
    const isNonMonthly = ['weekly', 'fortnightly', 'four_weekly'].includes(form.pay_frequency);
    // Form inputs are strings; the IncomeStream schema validates tax_settings
    // numeric fields as numbers, so empty strings must be dropped and the
    // rest parsed — otherwise the save is rejected and income never updates.
    const numOrOmit = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };
    const cleanTaxSettings = (ts) => ({
      ...ts,
      grossAnnual: numOrOmit(ts.grossAnnual),
      pensionValue: numOrOmit(ts.pensionValue),
      salarySacrificeMonthly: numOrOmit(ts.salarySacrificeMonthly),
      otherDeductionsMonthly: numOrOmit(ts.otherDeductionsMonthly),
    });
    const streamData = {
      is_primary: true,
      name: incomeMode === 'salary' ? 'Salary' : 'Take-home pay',
      income_mode: incomeMode,
      amount: incomeMode === 'net' ? (parseFloat(form.monthly_income) || 0) : 0,
      frequency: form.pay_frequency,
      start_date: (isNonMonthly || useStartDate) ? (form.pay_start_date || null) : null,
      pay_day: (!isNonMonthly && !useStartDate) ? (parseInt(form.pay_day) || 1) : null,
      pay_weekday: form.pay_weekday || 'none',
      tax_settings: incomeMode === 'salary' ? cleanTaxSettings(taxSettings) : null,
      scheduled_changes: (primaryChanges || [])
        .map(c => ({
          ...c,
          amount: c.amount === '' ? undefined : parseFloat(c.amount),
          gross_annual: c.gross_annual === '' ? undefined : parseFloat(c.gross_annual),
          effective_date: c.effective_date || null,
          end_date: c.end_date || null,
        }))
        .filter(c => c.effective_date),
    };
    savePrimary.mutate({ id: primaryStreamId, data: streamData });
    saveCurrency.mutate({ currency: form.currency, preferred_buffer: parseFloat(form.preferred_buffer) || 0 });
  };

  return (
    <PageContainer maxWidth="form" className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure your income and preferences" />

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
                ≈ {formatMoney(monthlyEquivalent, { currency: form.currency || '£', decimals: 2 })} / month
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
                  <span>{formatMoney(ukBreakdown.grossAnnual, { currency: form.currency || '£' })}</span>
                </div>
                <div className="flex justify-between text-destructive/80">
                  <span>Income Tax</span>
                  <span>− {formatMoney(ukBreakdown.incomeTax, { currency: form.currency || '£' })}</span>
                </div>
                <div className="flex justify-between text-destructive/80">
                  <span>National Insurance</span>
                  <span>− {formatMoney(ukBreakdown.nationalInsurance, { currency: form.currency || '£' })}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2 text-primary">
                  <span>Est. Monthly Take-Home</span>
                  <span>{formatMoney(ukBreakdown.takeHomeMonthly, { currency: form.currency || '£', decimals: 2 })}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Estimate only. Does not account for pension, student loans, or other deductions.</p>
              </div>
            )}

            {!useUkTax && rawIncome > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {formatMoney(monthlyEquivalent, { currency: form.currency || '£', decimals: 2 })} / month (gross)
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

        <div>
          <Label>Preferred Display Period</Label>
          <Select value={displayPeriod} onValueChange={v => setDisplayPeriod(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DISPLAY_PERIOD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Used as the default across all pages. Change it anywhere to update globally.</p>
        </div>

        <div>
          <Label>Budgeting Rule</Label>
          <Select value={budgetingRule} onValueChange={handleRuleChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RULE_KEYS.map(key => (
                <SelectItem key={key} value={key}>{BUDGET_RULES[key].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{BUDGET_RULES[budgetingRule]?.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">See your position and get personalised guidance on the <Link to="/budgeting" className="text-primary hover:underline">Budgeting</Link> page.</p>
        </div>

        <div>
          <Label>Preferred Financial Buffer</Label>
          <Input
            type="number"
            step="50"
            min="0"
            placeholder="e.g. 500"
            value={form.preferred_buffer}
            onChange={e => setForm({ ...form, preferred_buffer: e.target.value })}
          />
          <div className="flex gap-2 mt-2">
            {[200, 500, 1000].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, preferred_buffer: String(v) })}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                  form.preferred_buffer === String(v)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
                )}
              >
                {form.currency || '£'}{v}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">A minimum cushion you'd like to keep. Highlights pay cycles where your forecast drops below it. Not treated as a bill or expense.</p>
        </div>

        <div className="border-t border-border pt-4">
          <Label>Scheduled Future Income Changes</Label>
          <div className="mt-2">
            <IncomeChangesEditor changes={primaryChanges} onChange={setPrimaryChanges} incomeMode={incomeMode} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Schedule pay rises/reductions, bonuses or temporary overtime. These apply automatically to forecasts from their effective date.</p>
        </div>

        <Button onClick={handleSave} disabled={savePrimary.isPending || saveCurrency.isPending} className="gap-2 w-full">
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
          {getOtherStreams(incomeStreams).map(stream => (
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
          {getOtherStreams(incomeStreams).length === 0 && !showAddStream && (
            <p className="text-sm text-muted-foreground text-center py-3">No additional income streams yet</p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold font-heading">Financial Disclaimer</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              AfterBills provides planning tools and illustrative projections, not financial advice.
            </p>
            <Link to="/disclaimer" className="text-xs text-primary hover:underline mt-2 inline-block">
              Read the full disclaimer
            </Link>
          </div>
        </div>
      </motion.div>

      <AccountDataSection user={user} />
    </PageContainer>
  );
}