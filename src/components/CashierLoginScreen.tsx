"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Backspace, ArrowLeft, Users, Spinner } from '@phosphor-icons/react';
import type { CashierRecord } from '../hooks/useAuth';

// ─── PIN numpad (supports async onAttempt) ───────────────────────────────────
const PIN_LENGTH = 4;

function PinPad({
  title, subtitle, onAttempt, onBack,
}: {
  title: string;
  subtitle?: string;
  onAttempt: (pin: string) => Promise<boolean>;
  onBack: () => void;
}) {
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
      } else {
        setShake(true);
        setError('PIN incorrecto');
        setTimeout(() => { setShake(false); setDigits([]); setError(''); }, 750);
      }
    } finally {
      setLoading(false);
    }
  }, [onAttempt]);

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
        onBack();
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [shake, success, loading, onBack]);

  const pressDigit = (d: string) => {
    if (shake || success || loading || digits.length >= PIN_LENGTH) return;
    setError('');
    setDigits(prev => [...prev, d]);
  };
  const pressBack = () => { if (!shake && !success && !loading) setDigits(d => d.slice(0, -1)); };

  const KEYS: Array<string | null> = ['1','2','3','4','5','6','7','8','9',null,'0','⌫'];

  return (
    <div className="flex flex-col items-center w-full max-w-[280px] mx-auto">
      <button onClick={onBack}
        className="self-start flex items-center gap-1.5 text-[11px] font-bold text-muted hover:text-ink transition-colors mb-6">
        <ArrowLeft size={13} weight="bold" />Voltar
      </button>

      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors duration-300 ${success ? 'bg-success/12' : 'bg-accent/10'}`}>
        {loading
          ? <Spinner size={22} className="text-accent animate-spin" />
          : <Lock size={22} weight="bold" className={`transition-colors duration-300 ${success ? 'text-success' : 'text-accent'}`} />}
      </div>

      <div className="text-[15px] font-black text-ink mb-1">{title}</div>
      {subtitle && <div className="text-[12px] text-muted font-medium mb-5">{subtitle}</div>}
      {!subtitle && <div className="mb-5" />}

      <motion.div
        animate={shake ? { x: [-7, 7, -5, 5, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.38 }}
        className="flex items-center justify-center gap-4 mb-4"
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <motion.div key={i}
            animate={success && i < digits.length ? { scale: [1, 1.4, 1] } : {}}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className={`w-3 h-3 rounded-full transition-all duration-100 ${
              i < digits.length ? (success ? 'bg-success scale-110' : 'bg-accent scale-110') : 'bg-black/10'
            }`}
          />
        ))}
      </motion.div>

      <div className="h-5 flex items-center justify-center mb-3">
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }} className="text-[11px] text-danger font-semibold">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        {KEYS.map((k, i) => {
          if (k === null) return <div key={i} />;
          if (k === '⌫') return (
            <button key="back" onClick={pressBack}
              disabled={digits.length === 0 || shake || success || loading}
              className="h-[54px] rounded-xl bg-white/60 border border-black/[0.06] flex items-center justify-center hover:bg-white active:scale-95 transition-all disabled:opacity-25">
              <Backspace size={18} weight="bold" className="text-muted" />
            </button>
          );
          return (
            <button key={k} onClick={() => pressDigit(k)}
              disabled={shake || success || loading}
              className="h-[54px] rounded-xl bg-white/60 border border-black/[0.06] text-[22px] font-black text-ink hover:bg-white active:scale-95 transition-all disabled:opacity-50 select-none">
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cashier avatar ──────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-[oklch(0.88_0.12_250)]  text-[oklch(0.35_0.15_250)]',
  'bg-[oklch(0.88_0.12_140)]  text-[oklch(0.35_0.15_140)]',
  'bg-[oklch(0.88_0.12_30)]   text-[oklch(0.35_0.15_30)]',
  'bg-[oklch(0.88_0.12_320)]  text-[oklch(0.35_0.15_320)]',
  'bg-[oklch(0.88_0.12_190)]  text-[oklch(0.35_0.15_190)]',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFF;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── Screen ──────────────────────────────────────────────────────────────────
interface Props {
  cashiers:       CashierRecord[];
  storeName?:     string;
  onLoginCashier: (id: string, pin: string) => Promise<boolean>;
  onLoginAdmin:   (pin: string) => Promise<boolean>;
}

type Screen = 'pick' | 'cashier-pin' | 'admin-pin';

export function CashierLoginScreen({ cashiers, storeName, onLoginCashier, onLoginAdmin }: Props) {
  const [screen, setScreen] = useState<Screen>('pick');
  const [selectedCashier, setSelectedCashier] = useState<CashierRecord | null>(null);

  const activeCashiers = cashiers.filter(c => c.active && c.role === 'cashier');

  const handleCashierAttempt = useCallback(async (pin: string): Promise<boolean> => {
    if (!selectedCashier) return false;
    return onLoginCashier(selectedCashier.id, pin);
  }, [selectedCashier, onLoginCashier]);

  const handleAdminAttempt = useCallback(async (pin: string): Promise<boolean> => {
    return onLoginAdmin(pin);
  }, [onLoginAdmin]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[oklch(0.97_0.005_240)] overflow-auto p-6">
      <div className="absolute top-5 left-6 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-white text-[11px] font-black">L</span>
        </div>
        <span className="text-[11px] font-black text-muted uppercase tracking-wider">
          {storeName ?? 'Lumina POS'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'pick' && (
          <motion.div key="pick"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm">
            <h1 className="text-[22px] font-black text-ink text-center mb-1.5">Quem está a trabalhar?</h1>
            <p className="text-[13px] text-muted text-center font-medium mb-8">
              {activeCashiers.length > 0 ? 'Selecciona o teu perfil para começar' : 'Nenhum operador configurado'}
            </p>

            {activeCashiers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {activeCashiers.map(c => (
                  <button key={c.id}
                    onClick={() => { setSelectedCashier(c); setScreen('cashier-pin'); }}
                    className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-black/[0.07] hover:border-accent/30 hover:shadow-md hover:shadow-accent/[0.08] active:scale-[0.97] transition-all">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-black ${avatarColor(c.name)}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-bold text-ink leading-tight text-center">{c.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 mb-6">
                <div className="w-16 h-16 rounded-full bg-black/[0.05] flex items-center justify-center">
                  <Users size={28} weight="duotone" className="text-muted" />
                </div>
                <p className="text-[12px] text-muted font-medium text-center leading-relaxed max-w-[200px]">
                  Sem operadores criados.<br />Entre como administrador para adicionar.
                </p>
              </div>
            )}

            <div className="border-t border-black/[0.06] pt-5">
              <button onClick={() => setScreen('admin-pin')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-black/[0.08] text-[12px] font-bold text-muted hover:text-ink hover:bg-white hover:border-black/[0.14] transition-all">
                <Lock size={13} weight="bold" />Entrar como Administrador
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'cashier-pin' && selectedCashier && (
          <motion.div key="cashier-pin"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full">
            <PinPad
              title={selectedCashier.name}
              subtitle="Introduz o teu PIN para entrar"
              onAttempt={handleCashierAttempt}
              onBack={() => { setScreen('pick'); setSelectedCashier(null); }}
            />
          </motion.div>
        )}

        {screen === 'admin-pin' && (
          <motion.div key="admin-pin"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full">
            <PinPad
              title="Administrador"
              subtitle="Introduz a senha de administrador"
              onAttempt={handleAdminAttempt}
              onBack={() => setScreen('pick')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
