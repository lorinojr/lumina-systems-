"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  DeviceMobile,
  ArrowCounterClockwise,
  CurrencyCircleDollar,
  Question,
  CaretLeft,
} from '@phosphor-icons/react';
import { useSTKPush } from '../hooks/useSTKPush';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (!d.length) return '';
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}`;
}

// Success beep - crucial for noisy shops
function playSuccessBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Fallback: no sound if AudioContext fails
  }
}

const NUMERIC_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: () => void;
  onSwitchToCash: () => void;
  t: {
    title: string;
    phoneLabel: string;
    confirm: string;
    invalidNumber: string;
    communicating: string;
    checkPhone: string;
    resend: string;
    paidButNotWorking: string;
    paymentReceived: string;
    tryAgain: string;
    payCash: string;
    saldoInsuficiente: string;
    pinInvalido: string;
    cancelado: string;
    tempoExpirado: string;
    vodacom: string;
    movitel: string;
  };
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  onSuccess,
  onSwitchToCash,
  t,
}: PaymentModalProps) {
  const stk = useSTKPush({
    amount,
    onSuccess: () => {
      playSuccessBeep();
      onSuccess();
    },
    onSwitchToCash,
  });

  const successShownRef = useRef(false);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) stk.reset();
  }, [isOpen]);

  useEffect(() => {
    if (stk.state === 'success' && !successShownRef.current) {
      successShownRef.current = true;
      const timer = setTimeout(() => {
        stk.reset();
        onSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (stk.state !== 'success') successShownRef.current = false;
  }, [stk.state, onSuccess, stk.reset]);

  const handleKeypad = (key: string) => {
    if (key === 'back') {
      stk.setPhone((p) => p.slice(0, -1));
    } else if (key && stk.phone.length < 9) {
      stk.setPhone((p) => p + key);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={stk.state === 'input' ? onClose : undefined}
          className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-black/[0.05] focus:outline-none"
        >
          {/* State 4a: SUCCESS - Full green flash */}
          <AnimatePresence>
            {stk.state === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#059669] flex flex-col items-center justify-center p-10 z-50"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-2xl"
                >
                  <CheckCircle size={72} weight="bold" className="text-[#059669]" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 text-3xl font-black text-white uppercase tracking-tight"
                >
                  {t.paymentReceived}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* State 4b: FAILURE - Red screen */}
          <AnimatePresence>
            {stk.state === 'failure' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#DC2626] flex flex-col items-center justify-center p-10 z-50"
              >
                <p className="text-2xl font-black text-white text-center uppercase tracking-tight mb-8">
                  {stk.error}
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button
                    onClick={stk.tryAgain}
                    className="w-full py-5 bg-white text-[#DC2626] rounded-2xl font-bold text-lg hover:bg-white/90 transition-all shadow-xl"
                  >
                    {t.tryAgain}
                  </button>
                  <button
                    onClick={stk.switchToCash}
                    className="w-full py-5 bg-white/20 text-white border-2 border-white/50 rounded-2xl font-bold text-lg hover:bg-white/30 transition-all"
                  >
                    {t.payCash}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header - hidden on success/failure */}
          {stk.state !== 'success' && stk.state !== 'failure' && (
            <div className="p-6 border-b border-black/[0.05] flex justify-between items-center bg-surface/50">
              <h3 className="text-xl font-black text-ink uppercase tracking-tight">
                M-Pesa · {t.title}
              </h3>
              <button
                onClick={onClose}
                disabled={stk.state === 'loading' || stk.state === 'countdown'}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  stk.state === 'loading' || stk.state === 'countdown'
                    ? 'bg-black/5 text-muted cursor-not-allowed'
                    : 'bg-white border border-black/[0.05] hover:bg-black/5'
                )}
              >
                <X size={20} weight="bold" />
              </button>
            </div>
          )}

          {/* State 1: INPUT - Phone + Keypad */}
          {stk.state === 'input' && (
            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">
                  {t.phoneLabel}
                </p>
                <p className="text-4xl font-black text-ink tracking-tight tabular-nums">
                  {formatPhone(stk.phone) || '84 123 4567'}
                  <span className="text-muted animate-pulse">|</span>
                </p>
              </div>

              {/* Network icons */}
              <div className="flex justify-center gap-6">
                <div
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    stk.network === 'vodacom'
                      ? 'border-accent bg-accent/5'
                      : 'border-black/[0.05] bg-surface/50'
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-600 font-black text-xs">
                    V
                  </div>
                  <span className="text-[10px] font-bold uppercase">{t.vodacom}</span>
                </div>
                <div
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    stk.network === 'movitel'
                      ? 'border-accent bg-accent/5'
                      : 'border-black/[0.05] bg-surface/50'
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-600 font-black text-xs">
                    M
                  </div>
                  <span className="text-[10px] font-bold uppercase">{t.movitel}</span>
                </div>
              </div>

              {stk.error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-danger font-bold text-sm"
                >
                  {stk.error}
                </motion.p>
              )}

              {/* Numeric keypad */}
              <div className="grid grid-cols-3 gap-3">
                {NUMERIC_KEYS.map((key) => (
                  <button
                    key={key || 'empty'}
                    onClick={() => key && handleKeypad(key)}
                    className={cn(
                      'py-5 rounded-2xl font-black text-xl transition-all active:scale-95',
                      key === 'back'
                        ? 'bg-danger/10 text-danger hover:bg-danger/20'
                        : key
                          ? 'bg-surface border border-black/[0.05] hover:bg-black/5 text-ink'
                          : 'invisible'
                    )}
                  >
                    {key === 'back' ? <CaretLeft size={24} weight="bold" /> : key}
                  </button>
                ))}
              </div>

              <button
                onClick={stk.confirmPhone}
                className="w-full py-5 bg-accent text-white rounded-2xl font-bold text-lg hover:bg-accent/90 transition-all shadow-xl shadow-accent/20"
              >
                {t.confirm}
              </button>
            </div>
          )}

          {/* State 2: LOADING */}
          {stk.state === 'loading' && (
            <div className="p-12 flex flex-col items-center justify-center space-y-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full border-4 border-accent/20 border-t-accent"
              />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-extrabold text-ink">{t.communicating}</h3>
                <p className="text-muted text-sm font-medium">Enviando para {stk.phone}...</p>
              </div>
            </div>
          )}

          {/* State 3: COUNTDOWN */}
          {stk.state === 'countdown' && (
            <div className="p-10 flex flex-col items-center space-y-8">
              {/* Circular progress timer */}
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-black/5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="text-accent transition-all duration-300"
                    strokeDasharray={283}
                    strokeDashoffset={283 - (stk.countdown / 60) * 283}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black text-ink tabular-nums">{stk.countdown}</span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-bold text-ink">{t.checkPhone}</p>
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex"
                >
                  <DeviceMobile size={48} weight="thin" className="text-accent" />
                </motion.div>
              </div>

              {stk.canResend && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={stk.resendRequest}
                  className="px-6 py-3 border border-black/[0.1] rounded-xl font-bold text-sm text-muted hover:bg-black/5 transition-all ghost-style"
                >
                  {t.resend}
                </motion.button>
              )}

              {/* Safety valve */}
              <button
                onClick={stk.manualCheck}
                className="flex items-center gap-2 px-3 py-2 text-muted hover:text-ink text-sm font-medium transition-colors"
              >
                <Question size={18} weight="bold" />
                <span>{t.paidButNotWorking}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

