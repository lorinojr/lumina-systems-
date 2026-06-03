"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Lock, Monitor, Storefront, SignOut, Warning,
  FloppyDisk, Key, Backspace, Spinner,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StoreConfig } from '../hooks/useStoreConfig';

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

// ─── Section card ────────────────────────────────────────────────────────────
function Section({
  icon, iconBg, title, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas rounded-xl border border-black/[0.06] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-black/[0.06] bg-surface/40 flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        <h3 className="text-[11px] font-black text-ink uppercase tracking-[0.1em]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Mini senha input ────────────────────────────────────────────────────────
const PIN_LEN = 4;
function SenhaInput({ label, onComplete, disabled = false }: {
  label: string; onComplete: (pin: string) => void; disabled?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const press = (d: string) => {
    if (done || disabled) return;
    const next = [...digits, d].slice(0, PIN_LEN);
    setDigits(next);
    if (next.length === PIN_LEN) { setDone(true); onComplete(next.join('')); }
  };
  const back = () => { if (!done && !disabled) setDigits(d => d.slice(0, -1)); };

  return (
    <div>
      <div className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] mb-2">{label}</div>
      <div className="flex gap-2 mb-3 items-center min-h-[20px]">
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < digits.length ? 'bg-accent' : 'bg-black/10'}`} />
        ))}
        {done && <button onClick={() => { setDigits([]); setDone(false); }} className="ml-2 text-[10px] text-muted hover:text-accent font-semibold">apagar</button>}
      </div>
      {!done && (
        <div className="grid grid-cols-6 gap-1.5">
          {['1','2','3','4','5','6','7','8','9','0'].map(k => (
            <button key={k} onClick={() => press(k)} disabled={disabled}
              className="h-11 rounded-lg bg-surface border border-black/[0.05] text-[14px] font-black text-ink num hover:bg-black/[0.07] active:bg-black/[0.1] transition-colors disabled:opacity-40">{k}</button>
          ))}
          <button onClick={back} disabled={digits.length === 0 || disabled}
            aria-label="Apagar"
            className="h-11 rounded-lg bg-surface border border-black/[0.05] flex items-center justify-center hover:bg-black/[0.07] active:bg-black/[0.1] transition-colors disabled:opacity-25 col-span-2">
            <Backspace size={16} weight="bold" className="text-muted" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface SecurityModuleProps {
  config:              StoreConfig | null;
  clearConfig:         () => void;
  onChangePIN:         (oldPin: string, newPin: string) => Promise<boolean>;
  onUpdateStoreInfo:   (name: string, phone: string) => Promise<boolean>;
  onNotify:            (msg: string) => void;
}

export function SecurityModule({
  config, clearConfig, onChangePIN, onUpdateStoreInfo, onNotify,
}: SecurityModuleProps) {
  // ── Store config form ──────────────────────────────────────────────────────
  const [storeName,   setStoreName]   = useState(config?.storeName   ?? '');
  const [ownerPhone,  setOwnerPhone]  = useState(config?.ownerPhone  ?? '');
  const [storeErrors, setStoreErrors] = useState<{ storeName?: string; ownerPhone?: string }>({});
  const [storeSaving, setStoreSaving] = useState(false);

  const saveStore = async () => {
    const e: typeof storeErrors = {};
    if (!storeName.trim())  e.storeName  = 'Obrigatório';
    if (!ownerPhone.trim()) e.ownerPhone = 'Obrigatório';
    setStoreErrors(e);
    if (Object.keys(e).length > 0) return;
    setStoreSaving(true);
    const ok = await onUpdateStoreInfo(storeName.trim(), ownerPhone.trim());
    setStoreSaving(false);
    if (ok) onNotify('Configurações da loja guardadas.');
    else onNotify('Erro ao guardar. Verifique a ligação.');
  };

  // ── Senha management ───────────────────────────────────────────────────────
  const [senhaStep, setSenhaStep] = useState<'idle' | 'old' | 'new1' | 'new2'>('idle');
  const [pendingOld, setPendingOld] = useState('');
  const [pendingNew, setPendingNew] = useState('');
  const [senhaError, setSenhaError] = useState('');

  const startChange = () => { setSenhaStep('old'); setSenhaError(''); };
  const cancelSenha = () => { setSenhaStep('idle'); setPendingOld(''); setPendingNew(''); setSenhaError(''); };

  const handleOld  = (pin: string) => { setPendingOld(pin); setSenhaStep('new1'); };
  const handleNew1 = (pin: string) => { setPendingNew(pin); setSenhaStep('new2'); };
  const handleNew2 = async (pin: string) => {
    if (pin !== pendingNew) {
      setSenhaError('As senhas não coincidem.');
      setSenhaStep('new1');
      setPendingNew('');
      return;
    }
    const ok = await onChangePIN(pendingOld, pin);
    if (!ok) {
      setSenhaError('Senha actual incorrecta.');
      setSenhaStep('old');
      setPendingOld('');
      setPendingNew('');
      return;
    }
    setSenhaStep('idle');
    onNotify('Senha de administrador alterada.');
  };

  // ── Logout confirm ─────────────────────────────────────────────────────────
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="flex-1 h-full flex flex-col overflow-auto bg-canvas">
      <div className="px-6 py-4 border-b border-black/[0.06] bg-canvas shrink-0">
        <h2 className="text-sm font-black tracking-tight text-ink">Definições</h2>
        <p className="text-[11px] text-muted font-medium mt-0.5">Loja, segurança e controlos do sistema</p>
      </div>

      <div className="flex-1 p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-6xl w-full mx-auto auto-rows-min content-start">

        {/* ── Store settings ──────────────────────────── */}
        <Section icon={<Storefront size={14} weight="bold" className="text-accent" />} iconBg="bg-accent/10" title="Configurações da Loja">
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] block mb-1.5">Nome da Loja</label>
              <input type="text" value={storeName}
                onChange={e => { setStoreName(e.target.value); setStoreErrors(p => ({ ...p, storeName: undefined })); }}
                className={cn('w-full h-10 px-3 rounded-lg border bg-surface text-[13px] font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all',
                  storeErrors.storeName ? 'border-danger' : 'border-black/[0.08]')} />
              {storeErrors.storeName && <p className="mt-1 text-[10px] text-danger font-semibold">{storeErrors.storeName}</p>}
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] block mb-1.5">Telefone do Proprietário</label>
              <input type="tel" value={ownerPhone}
                onChange={e => { setOwnerPhone(e.target.value); setStoreErrors(p => ({ ...p, ownerPhone: undefined })); }}
                className={cn('w-full h-10 px-3 rounded-lg border bg-surface text-[13px] font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all',
                  storeErrors.ownerPhone ? 'border-danger' : 'border-black/[0.08]')} />
              {storeErrors.ownerPhone && <p className="mt-1 text-[10px] text-danger font-semibold">{storeErrors.ownerPhone}</p>}
            </div>
            <button onClick={saveStore} disabled={storeSaving}
              className="flex items-center gap-2 h-11 px-5 bg-accent text-white rounded-lg text-[13px] font-bold hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20 disabled:opacity-60">
              {storeSaving
                ? <Spinner size={14} className="animate-spin" />
                : <FloppyDisk size={14} weight="bold" />}
              Guardar
            </button>
          </div>
        </Section>

        {/* ── Admin senha ─────────────────────────────── */}
        <Section icon={<Key size={14} weight="bold" className="text-success" />} iconBg="bg-success/10" title="Senha de Administrador">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[11px] font-semibold text-muted">Activa · Protegida no servidor</span>
            </div>

            {senhaError && (
              <div className="mb-3 flex items-center gap-1.5 text-[11px] text-danger font-semibold">
                <Warning size={11} weight="fill" />{senhaError}
              </div>
            )}

            <AnimatePresence mode="wait">
              {senhaStep === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <button onClick={startChange}
                    className="w-full h-11 rounded-lg border border-black/[0.08] text-[13px] font-bold text-ink hover:bg-surface transition-colors">
                    Alterar Senha
                  </button>
                </motion.div>
              )}
              {senhaStep === 'old' && (
                <motion.div key="old" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <SenhaInput label="Senha Actual" onComplete={handleOld} />
                  <button onClick={cancelSenha} className="mt-3 text-[11px] text-muted hover:text-ink font-semibold transition-colors">Cancelar</button>
                </motion.div>
              )}
              {senhaStep === 'new1' && (
                <motion.div key="new1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <SenhaInput label="Nova Senha" onComplete={handleNew1} />
                  <button onClick={cancelSenha} className="mt-3 text-[11px] text-muted hover:text-ink font-semibold transition-colors">Cancelar</button>
                </motion.div>
              )}
              {senhaStep === 'new2' && (
                <motion.div key="new2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <SenhaInput label="Confirmar Nova Senha" onComplete={handleNew2} />
                  <button onClick={cancelSenha} className="mt-3 text-[11px] text-muted hover:text-ink font-semibold transition-colors">Cancelar</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>

        {/* ── System info ─────────────────────────────── */}
        <Section icon={<Monitor size={14} weight="bold" className="text-muted" />} iconBg="bg-black/[0.05]" title="Sistema">
          <div className="p-5 space-y-3">
            {[
              { label: 'Terminal',  value: config?.storeName ? `${config.storeName} · Balcão 1` : 'POS-01' },
              { label: 'Versão',    value: 'Vela POS 2.1.0' },
              { label: 'Auth',      value: 'Servidor (Supabase)' },
              { label: 'Licença',   value: 'Verificada pelo servidor' },
              { label: 'Dados',     value: 'Cloud + offline queue' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center text-[11px]">
                <span className="text-muted font-medium">{r.label}</span>
                <span className="font-semibold text-ink font-mono">{r.value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Logout ──────────────────────────────────── */}
        <Section icon={<SignOut size={14} weight="bold" className="text-muted" />} iconBg="bg-black/[0.05]" title="Conta">
          <div className="p-5">
            <p className="text-[11px] text-muted leading-relaxed mb-4">
              Desassocia este dispositivo da loja. Os dados no servidor não são afectados.
              Pode voltar a aceder através de <span className="font-semibold text-ink">"Já tenho uma loja"</span>.
            </p>
            <AnimatePresence mode="wait">
              {!confirmLogout ? (
                <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setConfirmLogout(true)}
                  className="w-full h-11 rounded-lg border border-danger/25 text-danger text-[13px] font-bold hover:bg-danger/[0.06] transition-colors flex items-center justify-center gap-2">
                  <SignOut size={14} weight="bold" />Sair deste Dispositivo
                </motion.button>
              ) : (
                <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl bg-danger/[0.05] border border-danger/20 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Warning size={13} weight="fill" className="text-danger shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-danger leading-snug">
                      A configuração da loja será apagada deste dispositivo. Para voltar a aceder, use <span className="font-black">"Já tenho uma loja"</span> no ecrã inicial.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmLogout(false)}
                      className="flex-1 h-11 rounded-lg border border-black/[0.08] text-[12px] font-bold text-muted hover:bg-black/[0.04] transition-colors">Cancelar</button>
                    <button onClick={clearConfig}
                      className="flex-1 h-11 rounded-lg bg-danger text-white text-[12px] font-bold hover:bg-danger/90 transition-colors">Confirmar</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>

      </div>
    </div>
  );
}
