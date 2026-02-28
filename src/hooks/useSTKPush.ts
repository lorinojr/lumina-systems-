import { useState, useCallback, useRef, useEffect } from 'react';

// Mozambican M-Pesa prefixes: 84/85 (Vodacom), 86/87 (Movitel)
const VALID_PREFIXES = ['84', '85', '86', '87'];
const PHONE_LENGTH = 9;
const COUNTDOWN_SECONDS = 60;
const RESEND_AFTER_SECONDS = 30;

export type STKState =
  | 'input'      // State 1: Phone number entry
  | 'loading'    // State 2: Sending to server
  | 'countdown'  // State 3: Waiting for PIN
  | 'success'    // State 4a: Payment received
  | 'failure';   // State 4b: Error/timeout

export type FailureReason =
  | 'Saldo Insuficiente'
  | 'PIN Inválido'
  | 'Cancelado pelo Utilizador'
  | 'Tempo Expirado'
  | 'Número Inválido'
  | string;

export type Network = 'vodacom' | 'movitel' | null;

export function getNetworkFromPrefix(prefix: string): Network {
  if (['84', '85'].includes(prefix)) return 'vodacom';
  if (['86', '87'].includes(prefix)) return 'movitel';
  return null;
}

export function validatePhone(phone: string): { valid: boolean; error?: FailureReason } {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== PHONE_LENGTH) {
    return { valid: false, error: 'Número Inválido' };
  }
  const prefix = digits.slice(0, 2);
  if (!VALID_PREFIXES.includes(prefix)) {
    return { valid: false, error: 'Número Inválido' };
  }
  return { valid: true };
}

// Mock API - replace with real Paytek/backend call
async function sendSTKPush(phone: string, amount: number): Promise<{ success: boolean; error?: FailureReason }> {
  await new Promise((r) => setTimeout(r, 1500)); // Simulate network delay
  // Simulate: 80% success for demo, or use deterministic logic
  const lastDigit = parseInt(phone.slice(-1), 10);
  if (lastDigit === 7) {
    return { success: false, error: 'Saldo Insuficiente' };
  }
  if (lastDigit === 8) {
    return { success: false, error: 'PIN Inválido' };
  }
  if (lastDigit === 9) {
    return { success: false, error: 'Cancelado pelo Utilizador' };
  }
  return { success: true };
}

// Mock status check - replace with real WebSocket/polling
async function checkPaymentStatus(): Promise<{ success: boolean; error?: FailureReason }> {
  await new Promise((r) => setTimeout(r, 800));
  return { success: true };
}

export interface UseSTKPushOptions {
  amount: number;
  onSuccess?: () => void;
  onFailure?: (reason: FailureReason) => void;
  onSwitchToCash?: () => void;
}

export function useSTKPush({ amount, onSuccess, onFailure, onSwitchToCash }: UseSTKPushOptions) {
  const [state, setState] = useState<STKState>('input');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<FailureReason | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backDisabledRef = useRef(false);

  const reset = useCallback(() => {
    setState('input');
    setPhone('');
    setError(null);
    setCountdown(COUNTDOWN_SECONDS);
    setCanResend(false);
    backDisabledRef.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const confirmPhone = useCallback(async () => {
    const { valid, error: err } = validatePhone(phone);
    if (!valid) {
      setError(err ?? 'Número Inválido');
      return;
    }
    setError(null);
    setState('loading');
    backDisabledRef.current = true;

    const result = await sendSTKPush(phone, amount);
    if (result.success) {
      setState('countdown');
      setCountdown(COUNTDOWN_SECONDS);
      setCanResend(false);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            setState('failure');
            setError('Tempo Expirado');
            onFailure?.('Tempo Expirado');
            return 0;
          }
          if (prev === COUNTDOWN_SECONDS - RESEND_AFTER_SECONDS) {
            setCanResend(true);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setState('failure');
      setError(result.error ?? 'Erro desconhecido');
      backDisabledRef.current = false;
      onFailure?.(result.error!);
    }
  }, [phone, amount, onFailure]);

  const resendRequest = useCallback(async () => {
    if (!canResend) return;
    setCanResend(false);
    setState('loading');
    const result = await sendSTKPush(phone, amount);
    if (result.success) {
      setState('countdown');
      setCountdown(COUNTDOWN_SECONDS);
      setCanResend(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            setState('failure');
            setError('Tempo Expirado');
            onFailure?.('Tempo Expirado');
            return 0;
          }
          if (prev === COUNTDOWN_SECONDS - RESEND_AFTER_SECONDS) setCanResend(true);
          return prev - 1;
        });
      }, 1000);
    } else {
      setState('failure');
      setError(result.error ?? 'Erro desconhecido');
      onFailure?.(result.error!);
    }
  }, [phone, amount, canResend, onFailure]);

  const manualCheck = useCallback(async () => {
    const result = await checkPaymentStatus();
    if (result.success) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setState('success');
      // onSuccess is called by PaymentModal after 2s green screen
    }
  }, []);

  const simulateSuccess = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setState('success');
    // onSuccess is called by PaymentModal after 2s green screen
  }, []);

  const tryAgain = useCallback(() => {
    reset();
  }, [reset]);

  const switchToCash = useCallback(() => {
    reset();
    onSwitchToCash?.();
  }, [reset, onSwitchToCash]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const prefix = phone.slice(0, 2);
  const network = getNetworkFromPrefix(prefix);

  return {
    state,
    phone,
    setPhone,
    error,
    countdown,
    canResend,
    backDisabled: backDisabledRef.current,
    network,
    confirmPhone,
    resendRequest,
    manualCheck,
    simulateSuccess,
    tryAgain,
    switchToCash,
    reset,
  };
}
