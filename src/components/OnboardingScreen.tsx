import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Backspace, Warning, Spinner, ArrowLeft } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import type { StoreConfig } from '../hooks/useStoreConfig';
import { VelaLogo } from './VelaLogo';

const PIN_LEN = 4;

interface Props {
  onComplete:        (config: StoreConfig) => void;
  onPlatformAccess?: () => void;
}

// ─── Step types ──────────────────────────────────────────────────────────────
type Step = 'phone' | 'pin' | 'saving';

export function OnboardingScreen({ onComplete, onPlatformAccess }: Props) {
  const [step, setStep] = useState<Step>('phone');

  // ── Hidden platform access (5 clicks on logo) ─────────────────────────────
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLogoClick = () => {
    if (!onPlatformAccess) return;
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 600);
    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      onPlatformAccess();
    }
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [phone,      setPhone]      = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loginError, setLoginError] = useState('');

  // ── Phone step ────────────────────────────────────────────────────────────
  function handlePhoneNext(ev: React.FormEvent) {
    ev.preventDefault();
    if (!phone.trim()) { setPhoneError('Introduza o número de telefone'); return; }
    setPhoneError('');
    setLoginError('');
    setStep('pin');
  }

  // ── PIN step ──────────────────────────────────────────────────────────────
  async function handlePin(pin: string) {
    setStep('saving');
    setLoginError('');
    try {
      const { data, error } = await supabase.rpc('login_store', {
        p_owner_phone: phone.trim(),
        p_admin_pin:   pin,
      });
      if (error) throw error;
      if (!data?.success) {
        const msg = data?.error === 'store_not_found'
          ? 'Nenhuma loja encontrada com este número.'
          : 'Senha incorrecta. Tente novamente.';
        setLoginError(msg);
        setStep('pin');
        return;
      }
      onComplete({ storeId: data.store_id, storeName: data.store_name, ownerPhone: data.owner_phone });
    } catch (e: any) {
      setLoginError(e.message ?? 'Erro de ligação. Tente novamente.');
      setStep('pin');
    }
  }

  const subtitle = {
    phone:  'Acesso à loja',
    pin:    'Acesso à loja',
    saving: 'A verificar credenciais…',
  }[step];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] bg-surface flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
        className="w-full max-w-[340px]"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <button
            type="button"
            onClick={handleLogoClick}
            className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white shadow-md shadow-accent/20 mb-4 cursor-default select-none focus:outline-none"
            aria-label="Vela"
          >
            <VelaLogo size={36} />
          </button>
          <h1 className="text-[28px] font-black text-ink leading-none mb-1.5 tracking-tight select-none">Vela POS</h1>
          <p className="text-[13px] text-muted font-medium text-center">{subtitle}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Phone ─────────────────────────────────────────────── */}
          {step === 'phone' && (
            <motion.form key="phone" onSubmit={handlePhoneNext}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5" noValidate
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-phone-input" className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">
                  Telefone do Proprietário
                </label>
                <input id="login-phone-input" type="tel" autoFocus autoComplete="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                  placeholder="ex: 84 123 4567"
                  className={`h-12 px-4 rounded-xl border bg-canvas text-[15px] font-semibold text-ink num placeholder:text-muted/40 outline-none transition-colors focus:ring-2 focus:ring-accent/25 focus:border-accent ${phoneError ? 'border-danger' : 'border-black/10'}`}
                />
                {phoneError && <p className="text-[11px] text-danger font-semibold leading-tight">{phoneError}</p>}
              </div>

              <motion.button type="submit" whileTap={{ scale: 0.97 }}
                className="w-full h-12 rounded-xl bg-accent text-white text-[15px] font-bold tracking-wide hover:bg-accent/90 active:bg-accent/80 transition-colors">
                Seguinte
              </motion.button>
            </motion.form>
          )}

          {/* ── PIN ───────────────────────────────────────────────── */}
          {step === 'pin' && (
            <motion.div key="pin"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {loginError && (
                <div className="flex items-center gap-1.5 text-[11px] text-danger font-semibold mb-4">
                  <Warning size={11} weight="fill" />{loginError}
                </div>
              )}
              <PINPad label="Senha de Administrador" onComplete={handlePin} />
              <button onClick={() => { setStep('phone'); setLoginError(''); }}
                className="mt-5 text-[11px] text-muted hover:text-ink font-semibold transition-colors flex items-center gap-1.5">
                <ArrowLeft size={11} weight="bold" /> Voltar
              </button>
            </motion.div>
          )}

          {/* ── Saving ────────────────────────────────────────────── */}
          {step === 'saving' && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8">
              <Spinner size={28} className="text-accent animate-spin" />
              <p className="text-[13px] text-muted font-semibold">A verificar credenciais…</p>
            </motion.div>
          )}

        </AnimatePresence>

        <p className="mt-8 text-center text-[11px] text-muted/70 font-medium">
          Os dados ficam guardados no servidor de forma segura
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Inline PIN pad ──────────────────────────────────────────────────────────
function PINPad({ label, onComplete }: { label: string; onComplete: (pin: string) => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [done,   setDone]   = useState(false);

  const press = (d: string) => {
    if (done) return;
    const next = [...digits, d].slice(0, PIN_LEN);
    setDigits(next);
    if (next.length === PIN_LEN) { setDone(true); onComplete(next.join('')); }
  };
  const back = () => { if (!done) setDigits(d => d.slice(0, -1)); };

  return (
    <div>
      <div className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] mb-3">{label}</div>
      <div className="flex items-center gap-3 mb-4 justify-center">
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < digits.length ? 'bg-accent' : 'bg-black/10'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {['1','2','3','4','5','6','7','8','9',null,'0','⌫'].map((k, i) => {
          if (k === null) return <div key={i} />;
          if (k === '⌫') return (
            <button key="back" onClick={back} disabled={digits.length === 0 || done}
              className="h-12 rounded-xl bg-canvas border border-black/[0.08] flex items-center justify-center hover:bg-surface active:bg-black/[0.05] transition-colors disabled:opacity-25">
              <Backspace size={16} weight="bold" className="text-muted" />
            </button>
          );
          return (
            <button key={k} onClick={() => press(k)} disabled={done}
              className="h-12 rounded-xl bg-canvas border border-black/[0.08] text-[18px] font-black text-ink num hover:bg-surface active:bg-black/[0.05] transition-colors disabled:opacity-50 select-none">
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
