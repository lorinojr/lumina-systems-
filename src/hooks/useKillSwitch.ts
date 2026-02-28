import { useState, useCallback, useMemo, useEffect } from 'react';

const STORAGE_KEY_HARD_LOCK = 'lumina_killswitch_hard_lock_date';
const STORAGE_KEY_LAST_UNLOCK = 'lumina_killswitch_last_unlock';
const DEFAULT_DEVICE_ID = 'LUM-88';
const DEFAULT_SUPPORT_PHONE = '+258 84 XXX XXXX';
const MONTHLY_AMOUNT_MT = 3500;

export type KillSwitchState = 'active' | 'gracePeriod' | 'locked' | 'verifying';

export interface KillSwitchConfig {
  /** Day of month when hard lock applies (e.g. 5 = 5th) */
  lockDayOfMonth: number;
  /** Owner phone for M-Pesa (pre-filled) */
  ownerPhone: string;
  deviceId: string;
  supportPhone: string;
  amountMt: number;
  /** Month name for display (e.g. "Fevereiro") */
  monthName: string;
}

const defaultConfig: KillSwitchConfig = {
  lockDayOfMonth: 5,
  ownerPhone: '84 123 4567',
  deviceId: DEFAULT_DEVICE_ID,
  supportPhone: DEFAULT_SUPPORT_PHONE,
  amountMt: MONTHLY_AMOUNT_MT,
  monthName: 'Fevereiro',
};

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysUntilLock(lockDayOfMonth: number): number {
  const today = new Date();
  const day = today.getDate();
  if (day >= lockDayOfMonth) return 0; // already at or past lock day
  return lockDayOfMonth - day;
}

/** Returns the next hard-lock date (e.g. "2025-03-05") for comparison */
function getHardLockDateForMonth(lockDayOfMonth: number): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const lockDate = new Date(year, month, lockDayOfMonth);
  if (lockDate > d) return lockDate.toISOString().slice(0, 10);
  return new Date(year, month + 1, lockDayOfMonth).toISOString().slice(0, 10);
}

export function useKillSwitch(initialConfig?: Partial<KillSwitchConfig>) {
  const config: KillSwitchConfig = { ...defaultConfig, ...initialConfig };

  const [hardLockDateLocal, setHardLockDateLocal] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_HARD_LOCK);
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnlockedByPayment, setIsUnlockedByPayment] = useState(false);
  const [showDay4Popup, setShowDay4Popup] = useState(false);
  const [lastDay4PopupTime, setLastDay4PopupTime] = useState<number>(0);

  const today = getTodayDateString();
  const daysUntilLock = getDaysUntilLock(config.lockDayOfMonth);
  const hardLockDate = hardLockDateLocal || getHardLockDateForMonth(config.lockDayOfMonth);

  const isPastHardLock = useMemo(() => {
    // Offline: use local date; even without internet, lock when past hardLockDate
    return today >= hardLockDate && !isUnlockedByPayment;
  }, [today, hardLockDate, isUnlockedByPayment]);

  const state: KillSwitchState = useMemo(() => {
    if (isVerifying) return 'verifying';
    if (isUnlockedByPayment) return 'active';
    if (isPastHardLock) return 'locked';
    if (daysUntilLock <= 3 && daysUntilLock >= 1) return 'gracePeriod';
    if (daysUntilLock === 0) return 'locked'; // lock day
    return 'active';
  }, [isVerifying, isUnlockedByPayment, isPastHardLock, daysUntilLock]);

  const daysUntilLockDisplay = Math.min(5, daysUntilLock);
  const isDay4 = daysUntilLock === 1;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_HARD_LOCK, hardLockDate);
  }, [hardLockDate]);

  useEffect(() => {
    if (!isDay4 || state !== 'gracePeriod') return;
    const interval = 2 * 60 * 60 * 1000;
    const now = Date.now();
    if (now - lastDay4PopupTime >= interval) {
      setShowDay4Popup(true);
      setLastDay4PopupTime(now);
    }
  }, [isDay4, state, lastDay4PopupTime]);

  const triggerPayment = useCallback(() => {
    setIsVerifying(true);
  }, []);

  const paymentSuccess = useCallback(() => {
    setIsVerifying(false);
    setIsUnlockedByPayment(true);
    if (typeof window !== 'undefined') {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextLock = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(config.lockDayOfMonth).padStart(2, '0')}`;
      setHardLockDateLocal(nextLock);
      localStorage.setItem(STORAGE_KEY_LAST_UNLOCK, new Date().toISOString());
    }
  }, [config.lockDayOfMonth]);

  const paymentFailure = useCallback(() => {
    setIsVerifying(false);
  }, []);

  const dismissDay4Popup = useCallback(() => {
    setShowDay4Popup(false);
  }, []);

  const forceLockForDemo = useCallback(() => {
    setHardLockDateLocal(today);
    setIsUnlockedByPayment(false);
  }, [today]);

  const forceUnlockForDemo = useCallback(() => {
    setIsUnlockedByPayment(true);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextLock = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-05`;
    setHardLockDateLocal(nextLock);
  }, []);

  return {
    state,
    config,
    daysUntilLock: daysUntilLockDisplay,
    isDay4,
    showDay4Popup,
    dismissDay4Popup,
    triggerPayment,
    paymentSuccess,
    paymentFailure,
    forceLockForDemo,
    forceUnlockForDemo,
  };
}
