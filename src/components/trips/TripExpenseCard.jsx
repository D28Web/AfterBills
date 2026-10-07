import { Check, Clock, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSplitShare, formatMoney } from '@/lib/money';

const CATEGORY_COLORS = {
  travel: 'text-blue-500 bg-blue-50',
  accommodation: 'text-purple-500 bg-purple-50',
  food: 'text-orange-500 bg-orange-50',
  activities: 'text-green-500 bg-green-50',
  transport: 'text-cyan-500 bg-cyan-50',
  shopping: 'text-pink-500 bg-pink-50',
  other: 'text-gray-500 bg-gray-50',
};

const CATEGORY_LABELS = {
  travel: 'Travel',
  accommodation: 'Accommodation',
  food: 'Food & Drink',
  activities: 'Activities',
  transport: 'Transport',
  shopping: 'Shopping',
  other: 'Other',
};

export const getExpenseShare = getSplitShare;

export default function TripExpenseCard({ expense, currency, onTogglePaid, onEdit, onDelete }) {
  const colorClass = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[expense.category] || expense.category;
  const share = getExpenseShare(expense);
  const isSplit = expense.is_split && expense.split_between > 1;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
      <button
        onClick={() => onTogglePaid(expense)}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
          expense.is_paid ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-transparent hover:border-primary'
        }`}
      >
        <Check className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colorClass}`}>{label}</span>
          {expense.is_paid ? (
            <span className="text-xs text-primary flex items-center gap-1">
              <Check className="w-3 h-3" /> Paid{expense.paid_date ? ` ${expense.paid_date}` : ''}
            </span>
          ) : expense.due_date ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Due {expense.due_date}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Unpaid</span>
          )}
          {isSplit && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {expense.split_between}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {isSplit ? (
          <>
            <p className={`text-sm font-bold font-heading ${expense.is_paid ? 'text-primary' : 'text-foreground'}`}>
              {formatMoney(share, { currency, decimals: 2 })}
            </p>
            <p className="text-xs text-muted-foreground line-through">{formatMoney(expense.amount, { currency, decimals: 2 })}</p>
          </>
        ) : (
          <p className={`text-sm font-bold font-heading ${expense.is_paid ? 'text-primary' : 'text-foreground'}`}>
            {formatMoney(expense.amount, { currency, decimals: 2 })}
          </p>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(expense)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(expense)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}