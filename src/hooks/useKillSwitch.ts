import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export type KillSwitchState = 'active' | 'gracePeriod' | 'locked' | 'loading';

export interface KillSwitchConfig {
  lockDayOfMonth: number;
  ownerPhone: string;
  deviceId: string;
  supportPhone: string;
  amountMt: number;
  monthName: string;
}

const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export function useKillSwitch(storeId: string | null, ownerPhone: string) {
  const [state, setState] = useState<KillSwitchState>('loading');
  const [daysRemaining, setDaysRemaining] = useState(30);
  const [amountMt, setAmountMt] = useState(3500);
  const [lockDay, setLockDay] = useState(5);
  const [showDay4Popup, setShowDay4Popup] = useState(false);

  const config: KillSwitchConfig = useMemo(() => ({
    lockDayOfMonth: lockDay,
    ownerPhone,
    deviceId: 'LUM-88',
    supportPhone: '+258 84 XXX XXXX',
    amountMt,
    monthName: MONTH_NAMES_PT[new Date().getMonth()],
  }), [lockDay, ownerPhone, amountMt]);

  const checkStatus = useCallback(async () => {
    if (!storeId) { setState('active'); return; }
    try {
      const { data, error } = await supabase.rpc('get_subscription_status', { p_store_id: storeId });
      if (error || !data) { setState('active'); return; }

      setAmountMt(data.amount_mt ?? 3500);
      setLockDay(data.lock_day_of_month ?? 5);
      setDaysRemaining(data.days_remaining ?? 30);

      if (data.status === 'locked') setState('locked');
      else if (data.status === 'grace_period') {
        setState('gracePeriod');
        if (data.days_remaining <= 1) setShowDay4Popup(true);
      } else {
        setState('active');
      }
    } catch {
      setState('active');
    }
  }, [storeId]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const paymentSuccess = useCallback(async () => {
    if (!storeId) return;
    try {
      const { data, error } = await supabase.rpc('record_subscription_payment', { p_store_id: storeId });
      if (!error && data?.success) {
        setState('active');
        setDaysRemaining(30);
      }
    } catch (e) {
      console.error('paymentSuccess:', e);
    }
  }, [storeId]);

  const dismissDay4Popup = useCallback(() => setShowDay4Popup(false), []);

  const forceLockForDemo = useCallback(() => setState('locked'), []);
  const forceUnlockForDemo = useCallback(() => { setState('active'); setDaysRemaining(30); }, []);

  return {
    state,
    config,
    daysUntilLock: daysRemaining,
    showDay4Popup,
    dismissDay4Popup,
    paymentSuccess,
    forceLockForDemo,
    forceUnlockForDemo,
    checkStatus,
  };
}
