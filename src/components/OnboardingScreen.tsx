import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Backspace, Warning, Spinner, Buildings, ArrowLeft } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import type { StoreConfig } from '../hooks/useStoreConfig';

const PIN_LEN = 4;

interface Props {
  onComplete:        (config: StoreConfig) => void;
  onPlatformAccess?: () => void;
}

// ─── Step types ──────────────────────────────────────────────────────────────
type Step =
  | 'choice'
  | 'info' | 'pin1' | 'pin2' | 'saving'
  | 'login-phone' | 'login-pin' | 'login-saving';

export function OnboardingScreen({ onComplete, onPlatformAccess }: Props) {
  const [step, setStep] = useState<Step>('choice');

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

  // ── New-store state ────────────────────────────────────────────────────────
  const [storeName,   setStoreName]   = useState('');
  const [ownerPhone,  setOwnerPhone]  = useState('');
  const [errors,      setErrors]      = useState<{ storeName?: string; ownerPhone?: string }>({});
  const [pin1,        setPin1]        = useState('');
  const [pinError,    setPinError]    = useState('');
  const [saveError,   setSaveError]   = useState('');

  // ── Existing-store state ───────────────────────────────────────────────────
  const [loginPhone,  setLoginPhone]  = useState('');
  const [loginPhoneError, setLoginPhoneError] = useState('');
  const [loginError,  setLoginError]  = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  function validateInfo() {
    const e: typeof errors = {};
    if (!storeName.trim())  e.storeName  = 'Introduza o nome da loja';
    if (!ownerPhone.trim()) e.ownerPhone = 'Introduza o número de telefone';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleInfoNext(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateInfo()) return;
    setStep('pin1');
  }

  function handlePin1(pin: string) { setPin1(pin); setPinError(''); setStep('pin2'); }

  async function handlePin2(pin: string) {
    if (pin !== pin1) {
      setPinError('As senhas não coincidem. Tente novamente.');
      setPin1('');
      setStep('pin1');
      return;
    }
    setStep('saving');
    setSaveError('');
    try {
      const { data, error } = await supabase.rpc('register_store', {
        p_store_name:  storeName.trim(),
        p_owner_phone: ownerPhone.trim(),
        p_admin_name:  'Admin',
        p_admin_pin:   pin,
      });
      if (error) throw error;
      onComplete({ storeId: data.store_id, storeName: storeName.trim(), ownerPhone: ownerPhone.trim() });
    } catch (e: any) {
      setSaveError(e.message ?? 'Erro ao criar a loja. Verifique a ligação.');
      setStep('pin1');
      setPin1('');
    }
  }

  // ── Existing-store login ───────────────────────────────────────────────────
  function handleLoginPhoneNext(ev: React.FormEvent) {
    ev.preventDefault();
    if (!loginPhone.trim()) { setLoginPhoneError('Introduza o número de telefone'); return; }
    setLoginPhoneError('');
    setLoginError('');
    setStep('login-pin');
  }

  async function handleLoginPin(pin: string) {
    setStep('login-saving');
    setLoginError('');
    try {
      const { data, error } = await supabase.rpc('login_store', {
        p_owner_phone: loginPhone.trim(),
        p_admin_pin:   pin,
      });
      if (error) throw error;
      if (!data?.success) {
        const msg = data?.error === 'store_not_found'
          ? 'Nenhuma loja encontrada com este número.'
          : 'Senha incorrecta. Tente novamente.';
        setLoginError(msg);
        setStep('login-pin');
        return;
      }
      onComplete({ storeId: data.store_id, storeName: data.store_name, ownerPhone: data.owner_phone });
    } catch (e: any) {
      setLoginError(e.message ?? 'Erro de ligação. Tente novamente.');
      setStep('login-pin');
    }
  }

  // ── Subtitle by step ──────────────────────────────────────────────────────
  const subtitle = {
    choice:        'O que pretende fazer?',
    info:          'Vamos configurar a sua loja',
    pin1:          'Defina a senha de administrador',
    pin2:          'Defina a senha de administrador',
    saving:        'A criar a loja…',
    'login-phone': 'Aceder a uma loja existente',
    'login-pin':   'Aceder a uma loja existente',
    'login-saving':'A verificar credenciais…',
  }[step];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] bg-[#FAFAF8] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
        className="w-full max-w-[340px]"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            onClick={handleLogoClick}
            className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-5 shadow-[0_4px_16px_oklch(0.45_0.2_250/.25)] cursor-default select-none"
          >
            <span className="text-white text-2xl font-black tracking-tight">L</span>
          </div>
          <h1 className="text-[28px] font-black text-ink leading-none mb-2 tracking-tight">Lumina POS</h1>
          <p className="text-[13px] text-muted font-medium text-center">{subtitle}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Choice screen ─────────────────────────────────────── */}
          {step === 'choice' && (
            <motion.div key="choice"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => setStep('info')}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-black/[0.07] hover:border-accent/40 hover:shadow-md hover:shadow-accent/[0.08] active:scale-[0.98] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-accent text-lg font-black">+</span>
                </div>
                <div>
                  <div className="text-[14px] font-black text-ink leading-tight">Nova loja</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">Registar pela primeira vez</div>
                </div>
              </button>

              <button
                onClick={() => setStep('login-phone')}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-black/[0.07] hover:border-black/[0.15] hover:shadow-sm active:scale-[0.98] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <Buildings size={18} weight="duotone" className="text-muted" />
                </div>
                <div>
                  <div className="text-[14px] font-black text-ink leading-tight">Já tenho uma loja</div>
                  <div className="text-[11px] text-muted font-medium mt-0.5">Aceder com telefone e senha</div>
                </div>
              </button>
            </motion.div>
          )}

          {/* ── New store: info ────────────────────────────────────── */}
          {step === 'info' && (
            <motion.form key="info" onSubmit={handleInfoNext}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5" noValidate
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="onb-storeName" className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Nome da Loja</label>
                <input id="onb-storeName" type="text" autoFocus autoComplete="organization"
                  value={storeName}
                  onChange={e => { setStoreName(e.target.value); setErrors(p => ({ ...p, storeName: undefined })); }}
                  placeholder="ex: Farmácia Central"
                  className={`h-12 px-4 rounded-xl border bg-white text-[15px] font-semibold text-ink placeholder:text-muted/40 outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${errors.storeName ? 'border-danger' : 'border-black/10'}`}
                />
                {errors.storeName && <p className="text-[11px] text-danger font-semibold leading-tight">{errors.storeName}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="onb-phone" className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">Telefone do Proprietário</label>
                <input id="onb-phone" type="tel" autoComplete="tel"
                  value={ownerPhone}
                  onChange={e => { setOwnerPhone(e.target.value); setErrors(p => ({ ...p, ownerPhone: undefined })); }}
                  placeholder="ex: 84 123 4567"
                  className={`h-12 px-4 rounded-xl border bg-white text-[15px] font-semibold text-ink placeholder:text-muted/40 outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${errors.ownerPhone ? 'border-danger' : 'border-black/10'}`}
                />
                {errors.ownerPhone && <p className="text-[11px] text-danger font-semibold leading-tight">{errors.ownerPhone}</p>}
              </div>

              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setStep('choice')}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-black/[0.08] text-[13px] font-bold text-muted hover:bg-black/[0.03] transition-colors">
                  <ArrowLeft size={13} weight="bold" />
                </button>
                <motion.button type="submit" whileTap={{ scale: 0.97 }}
                  className="flex-1 h-12 rounded-xl bg-accent text-white text-[15px] font-bold tracking-wide hover:bg-[oklch(0.42_0.2_250)] active:bg-[oklch(0.38_0.2_250)] transition-colors">
                  Seguinte
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* ── New store: PIN steps ───────────────────────────────── */}
          {(step === 'pin1' || step === 'pin2') && (
            <motion.div key={step}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {saveError && (
                <div className="flex items-center gap-1.5 text-[11px] text-danger font-semibold mb-4">
                  <Warning size={11} weight="fill" />{saveError}
                </div>
              )}
              {pinError && (
                <div className="flex items-center gap-1.5 text-[11px] text-danger font-semibold mb-4">
                  <Warning size={11} weight="fill" />{pinError}
                </div>
              )}
              <PINPad
                label={step === 'pin1' ? 'Senha (4 dígitos)' : 'Confirmar Senha'}
                onComplete={step === 'pin1' ? handlePin1 : handlePin2}
              />
              <button onClick={() => { setStep(step === 'pin2' ? 'pin1' : 'info'); setPinError(''); setSaveError(''); }}
                className="mt-5 text-[11px] text-muted hover:text-ink font-semibold transition-colors flex items-center gap-1.5">
                <ArrowLeft size={11} weight="bold" /> Voltar
              </button>
            </motion.div>
          )}

          {/* ── Existing store: phone ──────────────────────────────── */}
          {step === 'login-phone' && (
            <motion.form key="login-phone" onSubmit={handleLoginPhoneNext}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5" noValidate
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-phone-input" className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">
                  Telefone do Proprietário
                </label>
                <input id="login-phone-input" type="tel" autoFocus autoComplete="tel"
                  value={loginPhone}
                  onChange={e => { setLoginPhone(e.target.value); setLoginPhoneError(''); }}
                  placeholder="ex: 84 123 4567"
                  className={`h-12 px-4 rounded-xl border bg-white text-[15px] font-semibold text-ink placeholder:text-muted/40 outline-none transition-all focus:ring-2 focus:ring-accent/25 focus:border-accent ${loginPhoneError ? 'border-danger' : 'border-black/10'}`}
                />
                {loginPhoneError && <p className="text-[11px] text-danger font-semibold leading-tight">{loginPhoneError}</p>}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('choice')}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-black/[0.08] text-[13px] font-bold text-muted hover:bg-black/[0.03] transition-colors">
                  <ArrowLeft size={13} weight="bold" />
                </button>
                <motion.button type="submit" whileTap={{ scale: 0.97 }}
                  className="flex-1 h-12 rounded-xl bg-accent text-white text-[15px] font-bold tracking-wide hover:bg-[oklch(0.42_0.2_250)] transition-colors">
                  Seguinte
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* ── Existing store: PIN ────────────────────────────────── */}
          {step === 'login-pin' && (
            <motion.div key="login-pin"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {loginError && (
                <div className="flex items-center gap-1.5 text-[11px] text-danger font-semibold mb-4">
                  <Warning size={11} weight="fill" />{loginError}
                </div>
              )}
              <PINPad label="Senha de Administrador" onComplete={handleLoginPin} />
              <button onClick={() => { setStep('login-phone'); setLoginError(''); }}
                className="mt-5 text-[11px] text-muted hover:text-ink font-semibold transition-colors flex items-center gap-1.5">
                <ArrowLeft size={11} weight="bold" /> Voltar
              </button>
            </motion.div>
          )}

          {/* ── Saving / verifying ────────────────────────────────── */}
          {(step === 'saving' || step === 'login-saving') && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-8">
              <Spinner size={28} className="text-accent animate-spin" />
              <p className="text-[13px] text-muted font-semibold">
                {step === 'saving' ? 'A criar a loja…' : 'A verificar credenciais…'}
              </p>
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
              className="h-12 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center hover:bg-surface active:scale-95 transition-all disabled:opacity-25">
              <Backspace size={16} weight="bold" className="text-muted" />
            </button>
          );
          return (
            <button key={k} onClick={() => press(k)} disabled={done}
              className="h-12 rounded-xl bg-white border border-black/[0.06] text-[18px] font-black text-ink hover:bg-surface active:scale-95 transition-all disabled:opacity-50 select-none">
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
