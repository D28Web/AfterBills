import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/money';
import { billToMonthlyCost } from '@/lib/forecast';
import { BUDGET_CATEGORIES, classifyBill, classifyExpense, classifySavingsGoal, classifySinkingFund } from '@/lib/budgeting';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function ClassificationList({ bills = [], expenses = [], sinkingFunds = [], goals = [], overrides = [], overrideMap = {}, currency = '£' }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState({});

  // Build items grouped by budget category
  const items = [
    ...bills.map(b => ({
      id: b.id,
      type: 'bill',
      name: b.name,
      amount: billToMonthlyCost(b),
      defaultCat: classifyBill(b, {}),
      currentCat: classifyBill(b, overrideMap),
      override: overrides.find(o => o.item_type === 'bill' && o.item_id === b.id),
    })),
    ...expenses.map(e => ({
      id: e.id,
      type: 'expense',
      name: e.name,
      amount: parseFloat(e.amount) || 0,
      defaultCat: classifyExpense(e, {}),
      currentCat: classifyExpense(e, overrideMap),
      override: overrides.find(o => o.item_type === 'expense' && o.item_id === e.id),
    })),
    ...sinkingFunds.map(f => ({
      id: f.id,
      type: 'sinking_fund',
      name: f.name,
      amount: parseFloat(f.target_amount) || 0,
      defaultCat: classifySinkingFund(f, {}),
      currentCat: classifySinkingFund(f, overrideMap),
      override: overrides.find(o => o.item_type === 'sinking_fund' && o.item_id === f.id),
    })),
    ...goals.map(g => ({
      id: g.id,
      type: 'savings_goal',
      name: g.name,
      amount: parseFloat(g.target_amount) || 0,
      defaultCat: classifySavingsGoal(g, {}),
      currentCat: classifySavingsGoal(g, overrideMap),
      override: overrides.find(o => o.item_type === 'savings_goal' && o.item_id === g.id),
    })),
  ];

  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.currentCat]) grouped[item.currentCat] = [];
    grouped[item.currentCat].push(item);
  });

  const handleOverride = async (item, newCat) => {
    if (newCat === item.defaultCat) {
      // Reset to default — delete override
      if (item.override) {
        await base44.entities.BudgetOverride.delete(item.override.id);
      }
    } else {
      if (item.override) {
        await base44.entities.BudgetOverride.update(item.override.id, {
          budget_category: newCat,
        });
      } else {
        await base44.entities.BudgetOverride.create({
          item_type: item.type,
          item_id: item.id,
          item_name: item.name,
          budget_category: newCat,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['budget-overrides'] });
  };

  const toggle = (cat) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Classification</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Items are classified automatically. Override any item that is in the wrong budget category.
        </p>
      </div>
      {BUDGET_CATEGORIES.map(cat => {
        const catItems = grouped[cat.key] || [];
        if (catItems.length === 0) return null;
        const total = catItems.reduce((s, i) => s + i.amount, 0);
        const isExpanded = expanded[cat.key];
        return (
          <div key={cat.key} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(cat.key)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm font-medium">{cat.label}</span>
                <span className="text-xs text-muted-foreground">({catItems.length})</span>
              </div>
              <span className="text-sm font-semibold">{formatMoney(total, { currency, decimals: 2 })}</span>
            </button>
            {isExpanded && (
              <div className="border-t border-border divide-y divide-border">
                {catItems.map(item => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(item.amount, { currency, decimals: 2 })}
                        {item.currentCat !== item.defaultCat && (
                          <span className="ml-2 text-primary">· overridden</span>
                        )}
                      </p>
                    </div>
                    <Select
                      value={item.currentCat}
                      onValueChange={(v) => handleOverride(item, v)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUDGET_CATEGORIES.map(c => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}