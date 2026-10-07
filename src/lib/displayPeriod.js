/**
 * Global display period preference.
 *
 * Stored on the user entity (preferred_display_period) and mirrored in
 * localStorage for instant access on page load. Changing it in one place
 * updates everywhere — each page reads from the same source.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'preferred_display_period';
const VALID_PERIODS = ['weekly', 'fortnightly', 'four_weekly', 'monthly', 'quarterly', 'annually'];

export const DISPLAY_PERIOD_OPTIONS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Fortnightly', value: 'fortnightly' },
  { label: '4-Weekly', value: 'four_weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually', value: 'annually' },
];

export const DISPLAY_PERIOD_LABELS = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  four_weekly: '4-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export function getInitialDisplayPeriod() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_PERIODS.includes(stored)) return stored;
  } catch (e) {}
  return 'monthly';
}

/**
 * Hook for managing the global display period.
 * Reads from localStorage instantly, syncs with the user entity.
 * Changing the period updates localStorage + user entity, so all
 * pages pick up the new value on next mount or query refetch.
 */
export function useDisplayPeriod(user) {
  const [period, setPeriodState] = useState(getInitialDisplayPeriod);
  const queryClient = useQueryClient();
  const lastSynced = useRef(null);

  // Sync from user entity when it loads or changes
  useEffect(() => {
    const userPeriod = user?.preferred_display_period;
    if (userPeriod && VALID_PERIODS.includes(userPeriod) && userPeriod !== lastSynced.current) {
      lastSynced.current = userPeriod;
      setPeriodState(userPeriod);
      try { localStorage.setItem(STORAGE_KEY, userPeriod); } catch (e) {}
    }
  }, [user?.preferred_display_period]);

  const setPeriod = useCallback(async (newPeriod) => {
    if (!VALID_PERIODS.includes(newPeriod)) return;
    setPeriodState(newPeriod);
    lastSynced.current = newPeriod;
    try { localStorage.setItem(STORAGE_KEY, newPeriod); } catch (e) {}
    try {
      await base44.auth.updateMe({ preferred_display_period: newPeriod });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      // silently fail — period still works locally
    }
  }, [queryClient]);

  return [period, setPeriod];
}