import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AnimatePresence } from 'framer-motion';
import BillForm from '@/components/bills/BillForm';
import BillCard from '@/components/bills/BillCard';
import LoanPayoffCard from '@/components/bills/LoanPayoffCard';
import { CATEGORY_LABELS } from '@/lib/forecast';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';

export default function Bills() {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Bill.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setShowForm(false);
      setEditingBill(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Bill.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });

  const handleSubmit = (data) => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const currency = user?.currency || '£';
  const LOAN_CATS = ['loans', 'credit_cards'];
  const loanBills = bills.filter(b => LOAN_CATS.includes(b.category));
  const regularBills = bills.filter(b => !LOAN_CATS.includes(b.category));
  const filtered = filterCategory === 'all' ? regularBills : regularBills.filter(b => b.category === filterCategory);

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Bills"
        subtitle="Manage your recurring bills"
        actions={
          <Button onClick={() => { setEditingBill(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Bill
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
            filterCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        {Object.entries(CATEGORY_LABELS).filter(([key]) => !LOAN_CATS.includes(key)).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
              filterCategory === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {filtered.map(bill => (
              <BillCard
                key={bill.id}
                bill={bill}
                currency={currency}
                onEdit={b => { setEditingBill(b); setShowForm(true); }}
                onDelete={b => deleteMutation.mutate(b.id)}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No bills found. Add your first bill to get started.</p>
            </div>
          )}
        </div>
      )}

      {loanBills.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold font-heading tracking-tight text-foreground">Loans & Credit Cards</h3>
            <p className="text-sm text-muted-foreground mt-1">Track payoff progress toward your target dates</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {loanBills.map(bill => (
              <LoanPayoffCard
                key={bill.id}
                bill={bill}
                currency={currency}
                onEdit={b => { setEditingBill(b); setShowForm(true); }}
                onDelete={b => deleteMutation.mutate(b.id)}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditingBill(null); }}>
        <DialogContent className="max-w-md">
          <BillForm
            bill={editingBill}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingBill(null); }}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}