import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Receipt, Target, CheckCircle, ArrowRight, ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react';
import { ukTaxBreakdown } from '@/lib/ukTax';
import { formatMoney, roundMoney } from '@/lib/money';
import { FREQ_TO_MONTHLY } from '@/lib/income';

const STEPS = ['Welcome', 'Income', 'Bills', 'Goals', 'Done'];

const CATEGORIES = [
  { value: 'housing', label: 'Housing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'transport', label: 'Transport' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'loans', label: 'Loans' },
  { value: 'food', label: 'Food' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
];

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'four_weekly', label: 'Four-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

const BILL_FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          {i < STEPS.length - 1 && <div className={`w-6 h-0.5 transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  );
}

function emptyBill() {
  return { name: '', amount: '', category: 'other', frequency: 'monthly', start_date: new Date().toISOString().slice(0, 10) };
}

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Income step state
  const [income, setIncome] = useState({
    amount: '',
    pay_frequency: 'monthly',
    pay_day: '',
    currency: '£',
    useUkTax: false,
  });

  // Bills step state
  const [bills, setBills] = useState([emptyBill()]);

  // Goals step state
  const [goals, setGoals] = useState([{ name: '', target_amount: '' }]);

  const rawIncome = parseFloat(income.amount) || 0;
  const ukBreakdown = income.pay_frequency === 'annually' && income.useUkTax && rawIncome > 0
    ? ukTaxBreakdown(rawIncome)
    : null;
  const monthlyIncome = ukBreakdown
    ? ukBreakdown.takeHomeMonthly
    : roundMoney(rawIncome * (FREQ_TO_MONTHLY[income.pay_frequency] || 1));

  const handleFinish = async () => {
    setSaving(true);
    // Currency lives on the user; income is stored as the primary IncomeStream
    await base44.auth.updateMe({ currency: income.currency });
    await base44.entities.IncomeStream.create({
      is_primary: true,
      name: income.useUkTax ? 'Salary' : 'Take-home pay',
      income_mode: income.useUkTax ? 'salary' : 'net',
      amount: income.useUkTax ? 0 : (parseFloat(income.amount) || 0),
      frequency: income.pay_frequency,
      start_date: null,
      pay_day: income.pay_day ? parseInt(income.pay_day) : 1,
      pay_weekday: 'none',
      tax_settings: income.useUkTax
        ? { grossAnnual: parseFloat(income.amount) || 0, taxCode: '1257L', studentLoanPlan: 'none', pensionType: 'percent', pensionValue: 0, pensionIsSalarySacrifice: false, salarySacrificeMonthly: 0, otherDeductionsMonthly: 0 }
        : null,
    });

    // Save bills
    const validBills = bills.filter(b => b.name && b.amount);
    await Promise.all(validBills.map(b =>
      base44.entities.Bill.create({ ...b, amount: parseFloat(b.amount), is_recurring: true })
    ));

    // Save savings goals
    const validGoals = goals.filter(g => g.name && g.target_amount);
    await Promise.all(validGoals.map(g =>
      base44.entities.SavingsGoal.create({ name: g.name, target_amount: parseFloat(g.target_amount), current_amount: 0 })
    ));

    queryClient.invalidateQueries();
    navigate('/');
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            After<span className="text-primary">Bills</span>
          </h1>
        </div>

        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm"
          >
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-accent rounded-2xl w-fit mx-auto">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold font-heading">Welcome to AfterBills!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Let's get you set up in just a few minutes. We'll ask about your income, your regular bills, and any savings goals — then you'll have a full financial picture instantly.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: Wallet, label: 'Your Income' },
                    { icon: Receipt, label: 'Your Bills' },
                    { icon: Target, label: 'Your Goals' },
                  ].map(({ icon: Icon, label }, i) => (
                    <div key={i} className="bg-muted rounded-xl p-3 text-center">
                      <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs font-medium">{label}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={next} className="w-full gap-2 mt-2">
                  Let's Go <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step 1: Income */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent rounded-lg"><Wallet className="w-4 h-4 text-primary" /></div>
                  <h2 className="text-lg font-bold font-heading">Your Income</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Currency</Label>
                    <Select value={income.currency} onValueChange={v => setIncome({ ...income, currency: v })}>
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
                    <Label>Pay Frequency</Label>
                    <Select value={income.pay_frequency} onValueChange={v => setIncome({ ...income, pay_frequency: v, amount: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FREQ_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{FREQ_OPTIONS.find(f => f.value === income.pay_frequency)?.label || 'Gross'} Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{income.currency}</span>
                    <Input
                      type="number"
                      className="pl-8"
                      placeholder={income.pay_frequency === 'annually' ? 'e.g. 35000' : 'e.g. 2500'}
                      value={income.amount}
                      onChange={e => setIncome({ ...income, amount: e.target.value })}
                    />
                  </div>
                </div>

                {income.pay_frequency === 'annually' && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                    <div>
                      <p className="text-sm font-medium">Apply UK Tax Estimate</p>
                      <p className="text-xs text-muted-foreground">Income Tax & NI (2024/25)</p>
                    </div>
                    <Switch checked={income.useUkTax} onCheckedChange={v => setIncome({ ...income, useUkTax: v })} />
                  </div>
                )}

                {ukBreakdown && (
                  <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
                    <div className="flex justify-between text-destructive/80"><span>Income Tax</span><span>−{formatMoney(ukBreakdown.incomeTax, { currency: income.currency })}</span></div>
                    <div className="flex justify-between text-destructive/80"><span>National Insurance</span><span>−{formatMoney(ukBreakdown.nationalInsurance, { currency: income.currency })}</span></div>
                    <div className="flex justify-between font-semibold text-primary border-t border-border pt-1"><span>Monthly Take-Home</span><span>{formatMoney(ukBreakdown.takeHomeMonthly, { currency: income.currency, decimals: 2 })}</span></div>
                  </div>
                )}

                {!ukBreakdown && rawIncome > 0 && income.pay_frequency !== 'monthly' && (
                  <p className="text-xs text-muted-foreground">≈ {formatMoney(monthlyIncome, { currency: income.currency, decimals: 2 })} / month</p>
                )}

                <div>
                  <Label>Pay Day (day of month)</Label>
                  <Input
                    type="number" min="1" max="31" placeholder="e.g. 25"
                    value={income.pay_day}
                    onChange={e => setIncome({ ...income, pay_day: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Which day of the month do you get paid?</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={back} className="gap-1"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 gap-2" disabled={!income.amount}>
                    Next: Bills <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Bills */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent rounded-lg"><Receipt className="w-4 h-4 text-primary" /></div>
                  <div>
                    <h2 className="text-lg font-bold font-heading">Your Bills</h2>
                    <p className="text-xs text-muted-foreground">Add your regular outgoings</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {bills.map((bill, i) => (
                    <div key={i} className="bg-muted rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Bill name (e.g. Rent)"
                          value={bill.name}
                          className="flex-1 h-8 text-sm"
                          onChange={e => { const b = [...bills]; b[i].name = e.target.value; setBills(b); }}
                        />
                        <button onClick={() => setBills(bills.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{income.currency}</span>
                          <Input
                            type="number" placeholder="0.00"
                            className="pl-6 h-8 text-sm"
                            value={bill.amount}
                            onChange={e => { const b = [...bills]; b[i].amount = e.target.value; setBills(b); }}
                          />
                        </div>
                        <Select value={bill.frequency} onValueChange={v => { const b = [...bills]; b[i].frequency = v; setBills(b); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BILL_FREQ_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={bill.category} onValueChange={v => { const b = [...bills]; b[i].category = v; setBills(b); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={bill.start_date}
                          onChange={e => { const b = [...bills]; b[i].start_date = e.target.value; setBills(b); }}
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">Start / anchor date (determines due day)</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full gap-2 h-8 text-xs" onClick={() => setBills([...bills, emptyBill()])}>
                  <Plus className="w-3 h-3" /> Add Another Bill
                </Button>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={back} className="gap-1"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 gap-2">
                    Next: Goals <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Goals */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent rounded-lg"><Target className="w-4 h-4 text-primary" /></div>
                  <div>
                    <h2 className="text-lg font-bold font-heading">Savings Goals</h2>
                    <p className="text-xs text-muted-foreground">Optional — skip if you prefer</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Goal name (e.g. Holiday)"
                        value={goal.name}
                        className="flex-1"
                        onChange={e => { const g = [...goals]; g[i].name = e.target.value; setGoals(g); }}
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{income.currency}</span>
                        <Input
                          type="number" placeholder="0"
                          className="pl-7"
                          value={goal.target_amount}
                          onChange={e => { const g = [...goals]; g[i].target_amount = e.target.value; setGoals(g); }}
                        />
                      </div>
                      <button onClick={() => setGoals(goals.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full gap-2 h-8 text-xs" onClick={() => setGoals([...goals, { name: '', target_amount: '' }])}>
                  <Plus className="w-3 h-3" /> Add Goal
                </Button>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={back} className="gap-1"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={next} className="flex-1 gap-2">
                    Review & Finish <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-accent rounded-2xl w-fit mx-auto">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold font-heading">You're all set!</h2>
                <p className="text-muted-foreground text-sm">Here's a summary of what we'll save:</p>

                <div className="bg-muted rounded-xl p-4 text-sm space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly income</span>
                    <span className="font-semibold">{formatMoney(monthlyIncome, { currency: income.currency, decimals: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bills to add</span>
                    <span className="font-semibold">{bills.filter(b => b.name && b.amount).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Savings goals</span>
                    <span className="font-semibold">{goals.filter(g => g.name && g.target_amount).length}</span>
                  </div>
                  {ukBreakdown && (
                    <p className="text-xs text-muted-foreground pt-1">UK tax & NI applied to annual salary</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={back} className="gap-1"><ArrowLeft className="w-4 h-4" /></Button>
                  <Button onClick={handleFinish} disabled={saving} className="flex-1 gap-2">
                    {saving ? 'Saving...' : 'Go to Dashboard'} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}