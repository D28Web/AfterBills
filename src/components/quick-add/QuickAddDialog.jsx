import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Receipt, Wallet, Target, PiggyBank, CreditCard, ShoppingBag, FlaskConical,
  Plus, ArrowLeft, Check,
} from 'lucide-react';
import { logActivity } from '@/lib/activityLog';
import { toast } from 'sonner';
import QuickAddFormFields from '@/components/quick-add/QuickAddFormFields';
import BillForm from '@/components/bills/BillForm';
import IncomeStreamForm from '@/components/income/IncomeStreamForm';

const TYPES = [
  { key: 'bill', label: 'Bill', icon: Receipt },
  { key: 'income', label: 'Income Source', icon: Wallet },
  { key: 'savings_goal', label: 'Savings Goal', icon: Target },
  { key: 'sinking_fund', label: 'Sinking Fund', icon: PiggyBank },
  { key: 'debt', label: 'Debt', icon: CreditCard },
  { key: 'one_off', label: 'One-off Expense', icon: ShoppingBag },
  { key: 'scenario', label: 'What If Scenario', icon: FlaskConical },
];

const today = () => new Date().toISOString().slice(0, 10);

const getDefaultForm = (type) => {
  switch (type) {
    case 'bill': return { name: '', amount: '', category: 'other', frequency: 'monthly', start_date: today() };
    case 'income': return { name: '', amount: '', frequency: 'monthly' };
    case 'savings_goal': return { name: '', target_amount: '' };
    case 'sinking_fund': return { name: '', target_amount: '', target_date: '' };
    case 'debt': return { name: '', amount: '', remaining_balance: '', category: 'loans', frequency: 'monthly', start_date: today() };
    case 'one_off': return { name: '', amount: '', category: 'other', start_date: today() };
    default: return {};
  }
};

export default function QuickAddDialog({ variant = 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('menu');
  const [type, setType] = useState(null);
  const [form, setForm] = useState({});
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const reset = () => { setStep('menu'); setType(null); setForm({}); setCreated(null); };
  const handleClose = (v) => { setOpen(v); if (!v) setTimeout(reset, 200); };

  const handleSelectType = (t) => {
    if (t === 'scenario') { navigate('/what-if'); handleClose(false); return; }
    setType(t);
    setForm(getDefaultForm(t));
    setStep('form');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let result;
      switch (type) {
        case 'bill':
          result = await base44.entities.Bill.create({
            name: form.name, amount: parseFloat(form.amount), category: form.category,
            frequency: form.frequency, start_date: form.start_date, is_recurring: true,
          });
          queryClient.invalidateQueries({ queryKey: ['bills'] });
          logActivity('bill_created', 'bill', result.name, `Created bill "${result.name}"`);
          break;
        case 'income':
          result = await base44.entities.IncomeStream.create({
            name: form.name, amount: parseFloat(form.amount), frequency: form.frequency,
          });
          queryClient.invalidateQueries({ queryKey: ['income-streams'] });
          logActivity('income_changed', 'income', result.name, `Added income stream "${result.name}"`);
          break;
        case 'savings_goal':
          result = await base44.entities.SavingsGoal.create({
            name: form.name, type: 'general', target_amount: parseFloat(form.target_amount), current_amount: 0, is_emergency_fund: false,
          });
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          logActivity('savings_target_changed', 'savings_goal', result.name, `Created savings goal "${result.name}"`);
          break;
        case 'sinking_fund':
          result = await base44.entities.SinkingFund.create({
            name: form.name, target_amount: parseFloat(form.target_amount),
            target_date: form.target_date, current_amount: 0,
            contribution_frequency: 'monthly', status: 'active',
          });
          queryClient.invalidateQueries({ queryKey: ['sinking-funds'] });
          break;
        case 'debt':
          result = await base44.entities.Bill.create({
            name: form.name, amount: parseFloat(form.amount),
            remaining_balance: parseFloat(form.remaining_balance),
            category: form.category, frequency: form.frequency,
            start_date: form.start_date, is_recurring: true,
          });
          queryClient.invalidateQueries({ queryKey: ['bills'] });
          logActivity('debt_updated', 'debt', result.name, `Added debt "${result.name}"`);
          break;
        case 'one_off':
          result = await base44.entities.Bill.create({
            name: form.name, amount: parseFloat(form.amount), category: form.category,
            start_date: form.start_date, end_date: form.start_date, is_recurring: false,
          });
          queryClient.invalidateQueries({ queryKey: ['bills'] });
          logActivity('bill_created', 'bill', result.name, `Added one-off expense "${result.name}"`);
          break;
      }
      setCreated(result);
      setStep('success');
      toast.success('Created');
    } catch (err) {
      toast.error('Could not create. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDetails = () => {
    if (type === 'bill' || type === 'debt' || type === 'one_off' || type === 'income') {
      setStep('fullEditor');
    } else {
      const routes = { savings_goal: '/savings', sinking_fund: '/sinking-funds' };
      navigate(routes[type]);
      handleClose(false);
    }
  };

  const handleFullEditSubmit = (data) => {
    const isIncome = type === 'income';
    const updateFn = isIncome ? base44.entities.IncomeStream.update : base44.entities.Bill.update;
    updateFn(created.id, data).then(() => {
      queryClient.invalidateQueries({ queryKey: isIncome ? ['income-streams'] : ['bills'] });
      toast.success('Details updated');
      handleClose(false);
    }).catch(() => toast.error('Could not update'));
  };

  const triggerClass = variant === 'sidebar'
    ? 'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
    : 'p-2 rounded-lg hover:bg-muted transition-colors';

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClass} aria-label="Quick Add">
        <Plus className="w-4 h-4" />
        {variant === 'sidebar' && <span>Quick Add</span>}
      </button>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {step === 'menu' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-heading">Quick Add</h3>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => handleSelectType(t.key)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors text-left"
                    >
                      <div className="p-2 rounded-lg bg-accent shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setStep('menu')} className="p-1 hover:bg-muted rounded">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-semibold font-heading">
                  {TYPES.find(t => t.key === type)?.label}
                </h3>
              </div>
              <QuickAddFormFields type={type} form={form} setForm={setForm} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setStep('menu')}>Back</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Created <span className="font-semibold text-foreground">{created?.name}</span>
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setStep('menu')}>Add another</Button>
                <Button size="sm" onClick={handleEditDetails}>Edit details</Button>
                <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>Done</Button>
              </div>
            </div>
          )}

          {step === 'fullEditor' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setStep('success')} className="p-1 hover:bg-muted rounded">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-semibold font-heading">Edit Details</h3>
              </div>
              {type === 'income' ? (
                <IncomeStreamForm
                  stream={created}
                  onSubmit={handleFullEditSubmit}
                  onCancel={() => setStep('success')}
                />
              ) : (
                <BillForm
                  bill={created}
                  onSubmit={handleFullEditSubmit}
                  onCancel={() => setStep('success')}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}