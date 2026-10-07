import { Pencil, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { getCategoryMeta, PAYMENT_METHOD_LABELS } from '@/lib/expenses';

export default function ExpenseCard({ expense, currency = '£', onEdit, onDelete }) {
  const meta = getCategoryMeta(expense.category);
  const paymentLabel = expense.payment_method ? PAYMENT_METHOD_LABELS[expense.payment_method] : null;

  return (
    <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-3.5 hover:shadow-sm transition-shadow">
      <div
        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
        style={{ backgroundColor: meta.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{expense.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{meta.label}</span>
              {expense.date && (
                <>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </>
              )}
              {paymentLabel && (
                <>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground">{paymentLabel}</span>
                </>
              )}
            </div>
            {expense.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{expense.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="font-semibold text-sm whitespace-nowrap">
              {formatMoney(expense.amount, { currency, decimals: 2 })}
            </span>
            <button onClick={() => onEdit(expense)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(expense)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}