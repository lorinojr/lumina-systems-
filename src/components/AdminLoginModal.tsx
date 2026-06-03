import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Backspace, ArrowLeft, Spinner } from '@phosphor-icons/react';
import type { ActiveModule } from '../types';

const MODULE_LABELS: Partial<Record<ActiveModule, string>> = {
  inventory: 'Inventário',
  reports:   'Relatórios',
  security:  'Definições',
};

const PIN_LENGTH = 4;

interface Props {
  targetModule: ActiveModule;
  onAttempt:    (pin: string) => Promise<boolean>;
  onSuccess:    () => void;
  onClose:      () => void;
}

export function AdminLoginModal({ targetModule, onAttempt, onSuccess, onClose }: Props) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(async (pin: string) => {
    setLoading(true);
    try {
      const ok = await onAttempt(pin);
      if (ok) {
        setSuccess(true);
        setTimeout(onSuccess, 220);
      } else {
        setShake(true);
        setError('Senha incorrecta');
        setTimeout(() => { setShake(false); setDigits([]); setError(''); }, 750);
      }
    } finally {
      setLoading(false);
    }
  }, [onAttempt, onSuccess]);

  useEffect(() => {
    if (digits.length === PIN_LENGTH && !shake && !loading) submit(digits.join(''));
  }, [digits, shake, loading, submit]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (shake || success || loading) return;
      if (e.key >= '0' && e.key <= '9') {
        setError('');
        setDigits(d => d.length < PIN_LENGTH ? [...d, e.key] : d);
      } else if (e.key === 'Backspace') {
        setDigits(d => d.slice(0, -1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [shake, success, loading, onClose]);

  const pressDigit = (d: string) => {
    if (shake || success || loading || digits.length >= PIN_LENGTH) return;
    setError('');
    setDigits(prev => [...prev, d]);
  };
  const pressBack = () => { if (!shake && !success && !loading) setDigits(d => d.slice(0, -1)); };

  const KEYS: Array<string | null> = ['1','2','3','4','5','6','7','8','9',null,'0','⌫'];

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }} className="absolute inset-0 bg-black/55" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[292px] bg-canvas rounded-2xl shadow-2xl border border-black/[0.07] overflow-hidden">

        <button onClick={onClose}
          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[12px] font-bold text-muted hover:text-ink hover:bg-black/[0.04] active:bg-black/[0.06] transition-colors z-10">
          <ArrowLeft size={14} weight="bold" />Voltar
        </button>

        <div className="px-6 pt-12 pb-3 text-center">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300 ${success ? 'bg-success/12' : 'bg-accent/10'}`}>
            {loading
              ? <Spinner size={20} className="text-accent animate-spin" />
              : <Lock size={20} weight="bold" className={`transition-colors duration-300 ${success ? 'text-success' : 'text-accent'}`} />}
          </div>
          <div className="text-[13px] font-black text-ink">Administrador</div>
          <div className="text-[11px] text-muted font-medium mt-0.5">{MODULE_LABELS[targetModule] ?? targetModule}</div>
        </div>

        <motion.div animate={shake ? { x: [-7, 7, -5, 5, -3, 0] } : { x: 0 }}
          transition={{ duration: 0.38 }} className="flex items-center justify-center gap-3.5 py-4">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <motion.div key={i}
              animate={success && i < digits.length ? { scale: [1, 1.4, 1] } : {}}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={`w-3 h-3 rounded-full transition-all duration-100 ${
                i < digits.length ? (success ? 'bg-success scale-110' : 'bg-accent scale-110') : 'bg-black/10'
              }`} />
          ))}
        </motion.div>

        <div className="h-5 flex items-center justify-center mb-1">
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }} className="text-[11px] text-danger font-semibold">{error}</motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 pb-6 grid grid-cols-3 gap-2">
          {KEYS.map((k, i) => {
            if (k === null) return <div key={i} />;
            if (k === '⌫') return (
              <button key="back" onClick={pressBack} disabled={digits.length === 0 || shake || success || loading}
                className="h-[56px] rounded-xl bg-surface flex items-center justify-center hover:bg-black/[0.07] active:scale-95 transition-all disabled:opacity-25">
                <Backspace size={18} weight="bold" className="text-muted" />
              </button>
            );
            return (
              <button key={k} onClick={() => pressDigit(k)} disabled={shake || success || loading}
                className="h-[56px] rounded-xl bg-surface text-[22px] font-black text-ink hover:bg-black/[0.07] active:scale-95 transition-all disabled:opacity-50 select-none">{k}</button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
