import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, format } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_COLORS, CATEGORY_LABELS, getBillsForDay, getEffectiveBillShare } from '@/lib/forecast';
import { formatMoney, sumMoney, roundMoney } from '@/lib/money';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getPrimaryIncomeContext } from '@/lib/income';
import { getRegularBills } from '@/lib/salarySacrifice';
import { getRenewalsForDay } from '@/lib/contracts';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills'],
    queryFn: () => base44.entities.Bill.list(),
  });

  const { data: incomeStreams = [] } = useQuery({
    queryKey: ['income-streams'],
    queryFn: () => base44.entities.IncomeStream.list(),
  });

  const primaryCtx = getPrimaryIncomeContext(incomeStreams, user);
  const currency = user?.currency || '£';
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfWeek = getDay(startOfMonth(currentDate));
  const regularBills = getRegularBills(bills);

  const dailyData = useMemo(() => {
    const data = {};
    let runningBalance = primaryCtx.monthly_income || 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayBills = getBillsForDay(regularBills, day, month, year);
      const dayTotal = sumMoney(dayBills.map(b => getEffectiveBillShare(b, dayDate)));
      runningBalance = roundMoney(runningBalance - dayTotal);
      const dayRenewals = getRenewalsForDay(regularBills, day, month, year);
      data[day] = { bills: dayBills, total: dayTotal, balance: runningBalance, renewals: dayRenewals };
    }
    return data;
  }, [regularBills, month, year, primaryCtx.monthly_income, daysInMonth]);

  const dayBills = selectedDay ? dailyData[selectedDay] : null;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader title="Calendar" subtitle="See your bills throughout the month" />

      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-lg font-semibold font-heading">{format(currentDate, 'MMMM yyyy')}</h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(d => (
            <div key={d} className="text-xs text-muted-foreground text-center py-2 font-medium">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const data = dailyData[day];
            const hasBills = data?.bills.length > 0;
            const isSelected = selectedDay === day;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "relative p-1.5 md:p-2 rounded-xl text-center transition-all min-h-[3rem] md:min-h-[4rem]",
                  isSelected && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  !isSelected && isToday && "bg-accent",
                  !isSelected && !isToday && "hover:bg-muted",
                )}
              >
                <span className={cn("text-xs md:text-sm font-medium", isToday && !isSelected && "text-primary")}>{day}</span>
                {data.renewals?.length > 0 && (
                  <RefreshCw className="absolute top-1 right-1 w-2.5 h-2.5 text-amber-500" />
                )}
                {hasBills && (
                  <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                    {data.bills.slice(0, 3).map((b, j) => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[b.category] }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {dayBills && selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-5"
          >
            <h3 className="text-sm font-semibold font-heading mb-3">
              {format(new Date(year, month, selectedDay), 'EEEE, do MMMM')}
            </h3>
            {dayBills.renewals?.length > 0 && (
              <div className="space-y-1.5 mb-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Renewals
                </p>
                {dayBills.renewals.map((b, i) => (
                  <div key={`r-${i}`} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50/50 border border-amber-200/50 dark:bg-amber-900/10 dark:border-amber-800/30">
                    <RefreshCw className="w-3 h-3 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[b.category]}</p>
                    </div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Renewal</p>
                  </div>
                ))}
              </div>
            )}
            {dayBills.bills.length > 0 ? (
              <div className="space-y-2">
                {dayBills.bills.map((b, i) => {
                  const billDate = new Date(year, month, selectedDay);
                  return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-6 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[b.category] }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[b.category]}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatMoney(getEffectiveBillShare(b, billDate), { currency, decimals: 2 })}</p>
                  </div>
                  );
                })}
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="text-xs text-muted-foreground">Est. balance after</span>
                  <span className={cn("text-sm font-bold", dayBills.balance < 0 ? "text-destructive" : "text-primary")}>
                    {formatMoney(dayBills.balance, { currency, decimals: 2 })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bills due this day</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}