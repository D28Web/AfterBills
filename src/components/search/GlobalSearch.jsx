import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Receipt, Wallet, Target, PiggyBank, CreditCard, Plane, FlaskConical,
  Search, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { formatMoney } from '@/lib/money';

const TYPE_META = {
  bill: { label: 'Bill', icon: Receipt, route: '/bills' },
  debt: { label: 'Debt', icon: CreditCard, route: '/bills' },
  income: { label: 'Income', icon: Wallet, route: '/settings' },
  savings_goal: { label: 'Savings Goal', icon: Target, route: '/savings' },
  sinking_fund: { label: 'Sinking Fund', icon: PiggyBank, route: '/sinking-funds' },
  trip: { label: 'Trip', icon: Plane, route: '/trips' },
  scenario: { label: 'Scenario', icon: FlaskConical, route: '/what-if' },
};

const SCENARIO_TYPE_LABELS = {
  what_if: 'What If',
  affordability: 'Affordability',
  purchase: 'Large Purchase',
};

const extractItems = (res) => Array.isArray(res) ? res : (res.items || []);

export default function GlobalSearch({ variant = 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const { user } = useAuth();
  const currency = user?.currency || '£';
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return; }
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = { name: { $regex: term, $options: 'i' } };
        const [bills, income, goals, funds, trips, scenarios] = await Promise.all([
          base44.entities.Bill.filter(q, { limit: 5 }),
          base44.entities.IncomeStream.filter(q, { limit: 5 }),
          base44.entities.SavingsGoal.filter(q, { limit: 5 }),
          base44.entities.SinkingFund.filter(q, { limit: 5 }),
          base44.entities.Trip.filter(q, { limit: 5 }),
          base44.entities.Scenario.filter(q, { limit: 5 }),
        ]);

        const items = [
          ...extractItems(bills).map(b => ({
            id: b.id,
            type: ['loans', 'credit_cards'].includes(b.category) ? 'debt' : 'bill',
            name: b.name,
            summary: b.remaining_balance != null
              ? `${formatMoney(b.remaining_balance, { currency })} remaining`
              : `${formatMoney(b.amount, { currency })} · ${b.frequency}`,
          })),
          ...extractItems(income).map(s => ({
            id: s.id, type: 'income', name: s.name,
            summary: `${formatMoney(s.amount, { currency })} · ${s.frequency}`,
          })),
          ...extractItems(goals).map(g => ({
            id: g.id, type: 'savings_goal', name: g.name,
            summary: `${formatMoney(g.current_amount || 0, { currency })} of ${formatMoney(g.target_amount, { currency })}`,
          })),
          ...extractItems(funds).map(f => ({
            id: f.id, type: 'sinking_fund', name: f.name,
            summary: `${formatMoney(f.current_amount || 0, { currency })} of ${formatMoney(f.target_amount, { currency })}`,
          })),
          ...extractItems(trips).map(t => ({
            id: t.id, type: 'trip', name: t.name,
            summary: t.target_date ? `Target: ${t.target_date}` : '',
          })),
          ...extractItems(scenarios).map(s => ({
            id: s.id, type: 'scenario', name: s.name,
            summary: SCENARIO_TYPE_LABELS[s.type] || s.type,
          })),
        ];
        setResults(items);
      } catch (e) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currency]);

  const handleSelect = (item) => {
    const meta = TYPE_META[item.type];
    if (meta) navigate(meta.route);
    setOpen(false);
  };

  const triggerClass = variant === 'sidebar'
    ? 'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
    : 'p-2 rounded-lg hover:bg-muted transition-colors';

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClass} aria-label="Search">
        <Search className="w-4 h-4" />
        {variant === 'sidebar' && <span>Search</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search bills, income, goals, funds, trips, scenarios..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Start typing to search across your financial items
              </p>
            ) : results.length === 0 && !searching ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No results found
              </p>
            ) : (
              <div className="space-y-1">
                {results.map(item => {
                  const meta = TYPE_META[item.type];
                  const Icon = meta?.icon || Search;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-accent shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.summary && <p className="text-xs text-muted-foreground truncate">{item.summary}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{meta?.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}