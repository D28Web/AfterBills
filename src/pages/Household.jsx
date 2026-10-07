import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Trash2, Pencil, UserPlus, Wallet, Receipt, PiggyBank, CreditCard, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatMoney, sumMoney, roundMoney } from '@/lib/money';
import { billToMonthlyCost } from '@/lib/forecast';
import { getStreamMonthlyAmount } from '@/lib/income';
import { getRegularBills, getSalarySacrificeBills, getMonthlySalarySacrifice } from '@/lib/salarySacrifice';
import { motion } from 'framer-motion';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

const RELATIONSHIPS = ['Partner', 'Spouse', 'Child', 'Parent', 'Sibling', 'Lodger', 'Other'];

export default function Household() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: households = [] } = useQuery({ queryKey: ['households'], queryFn: () => base44.entities.Household.list() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => base44.entities.Bill.list() });
  const { data: incomeStreams = [] } = useQuery({ queryKey: ['income-streams'], queryFn: () => base44.entities.IncomeStream.list() });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => base44.entities.SavingsGoal.list() });

  const [showCreate, setShowCreate] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', relationship: '', is_dependant: false, notes: '' });

  const currency = user?.currency || '£';
  const household = households[0];

  const createHousehold = useMutation({
    mutationFn: data => base44.entities.Household.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['households'] }); setShowCreate(false); setHouseholdName(''); toast.success('Household created'); },
  });

  const updateHousehold = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Household.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['households'] }); setShowAddMember(false); setEditingMemberId(null); setMemberForm({ name: '', relationship: '', is_dependant: false, notes: '' }); toast.success('Updated'); },
  });

  const deleteHousehold = useMutation({
    mutationFn: id => base44.entities.Household.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['households'] }); toast.success('Household deleted'); },
  });

  const handleSaveMember = () => {
    if (!memberForm.name.trim()) return;
    const members = [...(household?.members || [])];
    if (editingMemberId) {
      const idx = members.findIndex(m => m.id === editingMemberId);
      if (idx >= 0) members[idx] = { ...members[idx], ...memberForm };
    } else {
      members.push({ id: crypto.randomUUID(), ...memberForm });
    }
    updateHousehold.mutate({ id: household.id, data: { members } });
  };

  const handleDeleteMember = (memberId) => {
    const members = (household?.members || []).filter(m => m.id !== memberId);
    updateHousehold.mutate({ id: household.id, data: { members } });
  };

  const startEditMember = (member) => {
    setEditingMemberId(member.id);
    setMemberForm({ name: member.name, relationship: member.relationship || '', is_dependant: member.is_dependant || false, notes: member.notes || '' });
    setShowAddMember(true);
  };

  // Financial overview
  const totalIncome = roundMoney(sumMoney(incomeStreams.map(s => getStreamMonthlyAmount(s))));
  const regularBills = getRegularBills(bills);
  const sharedBills = regularBills.filter(b => b.bill_assignment === 'shared');
  const personalBills = regularBills.filter(b => b.bill_assignment !== 'shared');
  const totalSharedBills = roundMoney(sumMoney(sharedBills.map(b => billToMonthlyCost(b))));
  const totalPersonalBills = roundMoney(sumMoney(personalBills.map(b => billToMonthlyCost(b))));
  const totalBills = roundMoney(sumMoney(regularBills.map(b => billToMonthlyCost(b))));
  const salarySacrificeMonthly = getMonthlySalarySacrifice(bills);
  const totalSavings = roundMoney(sumMoney(goals.map(g => parseFloat(g.current_amount) || 0)));
  const remaining = roundMoney(totalIncome - totalBills);

  if (!household) {
    return (
      <PageContainer maxWidth="form" className="space-y-6">
        <PageHeader title="Household" subtitle="Manage your household and family finances" />
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h2 className="text-lg font-semibold font-heading mb-2">No household set up</h2>
          <p className="text-sm text-muted-foreground mb-4">Create a household to track combined income, shared bills, and family savings.</p>
          {!showCreate ? (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Household
            </Button>
          ) : (
            <div className="max-w-sm mx-auto space-y-3">
              <Input placeholder="Household name (e.g. The Smiths)" value={householdName} onChange={e => setHouseholdName(e.target.value)} />
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={() => householdName.trim() && createHousehold.mutate({ name: householdName, members: [] })} disabled={!householdName.trim()}>Create</Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Household"
        subtitle={household.name}
        actions={
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteHousehold.mutate(household.id)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        }
      />

      {/* Financial overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Combined Income', value: totalIncome, icon: Wallet, color: 'text-primary' },
          { label: 'Shared Bills', value: totalSharedBills, icon: Users },
          { label: 'Personal Bills', value: totalPersonalBills, icon: Receipt },
          { label: 'Remaining', value: remaining, icon: TrendingUp, color: remaining >= 0 ? 'text-primary' : 'text-destructive' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className={`w-4 h-4 ${stat.color || ''}`} />
                <span className="text-xs uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold font-heading ${stat.color || 'text-foreground'}`}>{formatMoney(stat.value, { currency, decimals: 2 })}</p>
            </motion.div>
          );
        })}
      </div>

      {salarySacrificeMonthly > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
          <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Salary sacrifice: <span className="font-medium text-foreground">{formatMoney(salarySacrificeMonthly, { currency, decimals: 2 })}</span>/mo (pre-tax, not deducted again)</span>
        </div>
      )}

      {/* Members */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-heading">Household Members</h3>
          {!showAddMember && (
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => { setEditingMemberId(null); setMemberForm({ name: '', relationship: '', is_dependant: false, notes: '' }); setShowAddMember(true); }}>
              <UserPlus className="w-3 h-3" /> Add Member
            </Button>
          )}
        </div>

        {showAddMember && (
          <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Member name" />
              </div>
              <div>
                <Label>Relationship / Role</Label>
                <Input value={memberForm.relationship} onChange={e => setMemberForm({ ...memberForm, relationship: e.target.value })} placeholder="e.g. Partner, Child" list="relationships" />
                <datalist id="relationships">
                  {RELATIONSHIPS.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={memberForm.is_dependant} onCheckedChange={v => setMemberForm({ ...memberForm, is_dependant: v })} />
              <Label>Dependant (e.g. child — no full financial profile needed)</Label>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={memberForm.notes} onChange={e => setMemberForm({ ...memberForm, notes: e.target.value })} placeholder="Any extra details" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAddMember(false); setEditingMemberId(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleSaveMember} disabled={!memberForm.name.trim()}>{editingMemberId ? 'Update' : 'Add'} Member</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {(household.members || []).map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {member.relationship && <span>{member.relationship}</span>}
                    {member.is_dependant && <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Dependant</span>}
                    {member.notes && <span>· {member.notes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditMember(member)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteMember(member.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(household.members || []).length === 0 && !showAddMember && (
            <p className="text-sm text-muted-foreground text-center py-4">No members yet. Add your first household member above.</p>
          )}
        </div>
      </div>

      {/* Savings overview */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold font-heading">Household Savings</h3>
        </div>
        <p className="text-2xl font-bold font-heading">{formatMoney(totalSavings, { currency, decimals: 2 })}</p>
        <p className="text-xs text-muted-foreground mt-1">Across {goals.length} savings {goals.length === 1 ? 'goal' : 'goals'}</p>
      </div>
    </PageContainer>
  );
}