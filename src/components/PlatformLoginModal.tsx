import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Backspace, X, Buildings, CheckCircle } from '@phosphor-icons/react';

const PIN_LENGTH = 8;

// ─── Platform accent (indigo/violet — distinct from store blue) ──────────────
const P_BG    = 'oklch(0.13 0.018 258)';
const P_PILL  = 'oklch(0.48 0.20 280)';
const P_DIM   = 'oklch(0.55 0.06 258)';

interface Props {
  onLogin:  (username: string, pin: string) => boolean;
  onClose:  () => void;
}

export function PlatformLoginModal({ onLogin, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [digits,   setDigits]   = useState<string[]>([]);
  const [shake,    setShake]    = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState('');
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { usernameRef.current?.focus(); }, []);

  const submit = useCallback((u: string, pin: string) => {
    const ok = onLogin(u, pin);
    if (ok) {
      setSuccess(true);
      setTimeout(onClose, 420);
    } else {
      setShake(true);
      setError('Credenciais incorrectas');
      setTimeout(() => { setShake(false); setDigits([]); setError(''); }, 750);
    }
  }, [onLogin, onClose]);

  useEffect(() => {
    if (digits.length === PIN_LENGTH && !shake && !success && username.trim()) {
      submit(username.trim(), digits.join(''));
    }
  }, [digits, shake, success, username, submit]);

  // Keyboard: only capture digit/backspace when username field is NOT focused
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (shake || success) return;
      const inInput = (e.target as HTMLElement).tagName === 'INPUT';
      if (inInput) return;
      if (e.key >= '0' && e.key <= '9') {
        if (!username.trim()) { usernameRef.current?.focus(); return; }
        e.preventDefault();
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
  }, [shake, success, username, onClose]);

  const pressDigit = (d: string) => {
    if (shake || success || digits.length >= PIN_LENGTH) return;
    if (!username.trim()) { usernameRef.current?.focus(); return; }
    setError('');
    setDigits(prev => [...prev, d]);
  };

  const KEYS: Array<string | null> = ['1','2','3','4','5','6','7','8','9',null,'0','⌫'];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[308px] bg-white rounded-2xl shadow-2xl border border-black/[0.07] overflow-hidden"
      >
        <button onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors z-10">
          <X size={13} weight="bold" />
        </button>

        {/* ── Dark header band ─────────────────────────────────── */}
        <div className="px-6 pt-6 pb-5 text-center" style={{ background: P_BG }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: P_PILL }}>
            {success
              ? <CheckCircle size={24} weight="fill" className="text-white" />
              : <Buildings   size={22} weight="fill" className="text-white" />}
          </div>
          <div className="text-[13px] font-black text-white tracking-widest uppercase">Lumina Systems</div>
          <div className="text-[10.5px] font-medium mt-0.5" style={{ color: P_DIM }}>
            Acesso de Operador
          </div>
        </div>

        {/* ── Form body ────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-5">
          {/* Email */}
          <div className="mb-4">
            <label className="field-label">Email</label>
            <input
              ref={usernameRef}
              type="email"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); /* shift focus to numpad */ }
              }}
              placeholder="email@lumina.co.mz"
              autoComplete="email"
              spellCheck={false}
              className="field-input"
            />
          </div>

          {/* Password label + dots */}
          <label className="field-label">Senha</label>
          <motion.div
            animate={shake ? { x: [-7, 7, -5, 5, -3, 0] } : { x: 0 }}
            transition={{ duration: 0.38 }}
            className="flex items-center justify-center gap-4 py-3.5"
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <motion.div key={i}
                animate={success && i < digits.length ? { scale: [1, 1.5, 1] } : {}}
                transition={{ delay: i * 0.06, duration: 0.25 }}
                className="w-[13px] h-[13px] rounded-full transition-all duration-100"
                style={{
                  background: i < digits.length
                    ? (success ? 'var(--color-success)' : P_PILL)
                    : 'oklch(0.88 0 0)',
                  transform: i < digits.length ? 'scale(1.12)' : 'scale(1)',
                }}
              />
            ))}
          </motion.div>

          <div className="h-5 flex items-center justify-center mb-2">
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-[11px] text-danger font-semibold">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k, i) => {
              if (k === null) return <div key={i} />;
              if (k === '⌫') return (
                <button key="back"
                  onClick={() => { if (!shake && !success) setDigits(d => d.slice(0, -1)); }}
                  disabled={digits.length === 0 || shake || success}
                  className="h-[52px] rounded-xl bg-surface flex items-center justify-center hover:bg-black/[0.07] active:scale-95 transition-all disabled:opacity-25">
                  <Backspace size={17} weight="bold" className="text-muted" />
                </button>
              );
              return (
                <button key={k} onClick={() => pressDigit(k)}
                  disabled={shake || success}
                  className="h-[52px] rounded-xl bg-surface text-[21px] font-black text-ink hover:bg-black/[0.07] active:scale-95 transition-all disabled:opacity-50 select-none">
                  {k}
                </button>
              );
            })}
          </div>

          {/* Hint */}
          <p className="text-[10px] text-muted/60 font-medium text-center mt-3.5">
            Credenciais de operador Lumina
          </p>
        </div>
      </motion.div>
    </div>
  );
}
