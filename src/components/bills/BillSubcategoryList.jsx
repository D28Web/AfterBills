import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus } from 'lucide-react';
import BillSubcategoryForm from '@/components/bills/BillSubcategoryForm';
import { formatMoney } from '@/lib/money';

export default function BillSubcategoryList({ bill, currency = '£' }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['bill-subcategories', bill.id],
    queryFn: () => base44.entities.BillSubcategory.filter({ bill_id: bill.id }, { sort: 'created_date' }),
  });
  const subcats = data?.items || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['bill-subcategories', bill.id] });

  const createMut = useMutation({
    mutationFn: d => base44.entities.BillSubcategory.create({ ...d, bill_id: bill.id }),
    onSuccess: () => { invalidate(); setShowForm(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BillSubcategory.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.BillSubcategory.delete(id),
    onSuccess: invalidate,
  });

  const handleSubmit = (data) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const allocated = subcats.reduce((s, c) => s + (c.budget_amount || 0), 0);
  const total = bill.amount || 0;
  const pct = total > 0 ? Math.min(100, (allocated / total) * 100) : 0;
  const over = allocated > total;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Allocated budget</span>
          <span className={over ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {formatMoney(allocated, { currency, decimals: 2 })} / {formatMoney(total, { currency, decimals: 2 })}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${over ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
        {over && (
          <p className="text-xs text-destructive mt-1">Over budget by {formatMoney(allocated - total, { currency, decimals: 2 })}</p>
        )}
      </div>

      {subcats.map(c => (
        editing?.id === c.id ? (
          <BillSubcategoryForm key={c.id} subcategory={c} currency={currency} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm text-muted-foreground">{formatMoney(c.budget_amount, { currency, decimals: 2 })}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setShowForm(false); }}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(c.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )
      ))}

      {showForm && !editing && (
        <BillSubcategoryForm currency={currency} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      )}

      {!showForm && !editing && (
        <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add subcategory
        </Button>
      )}
    </div>
  );
}