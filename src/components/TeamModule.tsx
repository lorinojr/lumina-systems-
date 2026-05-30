"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UserPlus, Trash, Key, X, Warning,
  Backspace, Users,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CashierRecord } from '../hooks/useAuth';

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

// ─── Avatar ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-[oklch(0.88_0.12_250)] text-[oklch(0.35_0.15_250)]',
  'bg-[oklch(0.88_0.12_140)] text-[oklch(0.35_0.15_140)]',
  'bg-[oklch(0.88_0.12_30)]  text-[oklch(0.35_0.15_30)]',
  'bg-[oklch(0.88_0.12_320)] text-[oklch(0.35_0.15_320)]',
  'bg-[oklch(0.88_0.12_190)] text-[oklch(0.35_0.15_190)]',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFF;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── Inline PIN pad ──────────────────────────────────────────────────────────
const PIN_LEN = 4;

function PINPad({ label, onComplete, onCancel }: {
  label: string; onComplete: (pin: string) => void; onCancel?: () => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const press = (d: string) => {
    if (done) return;
    const next = [...digits, d].slice(0, PIN_LEN);
    setDigits(next);
    if (next.length === PIN_LEN) { setDone(true); onComplete(next.join('')); }
  };
  const back = () => { if (!done) setDigits(d => d.slice(0, -1)); };

  return (
    <div>
      <div className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] mb-2">{label}</div>
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < digits.length ? 'bg-accent' : 'bg-black/10'}`} />
        ))}
        {done && <button onClick={() => { setDigits([]); setDone(false); }} className="ml-2 text-[10px] text-muted hover:text-accent font-semibold">apagar</button>}
      </div>
      {!done && (
        <div className="grid grid-cols-6 gap-1">
          {['1','2','3','4','5','6','7','8','9','0'].map(k => (
            <button key={k} onClick={() => press(k)}
              className="h-9 rounded-lg bg-surface text-[13px] font-black text-ink hover:bg-black/[0.07] active:scale-95 transition-all">{k}</button>
          ))}
          <button onClick={back} disabled={digits.length === 0}
            className="h-9 rounded-lg bg-surface flex items-center justify-center hover:bg-black/[0.07] active:scale-95 transition-all disabled:opacity-25 col-span-2">
            <Backspace size={14} weight="bold" className="text-muted" />
          </button>
        </div>
      )}
      {onCancel && <button onClick={onCancel} className="mt-3 text-[11px] text-muted hover:text-ink font-semibold transition-colors">Cancelar</button>}
    </div>
  );
}

// ─── Add Cashier form ────────────────────────────────────────────────────────
function AddCashierForm({ onAdd, onCancel }: {
  onAdd: (name: string, pin: string) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<'name' | 'pin1' | 'pin2'>('name');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [pin1, setPin1] = useState('');
  const [pinError, setPinError] = useState('');

  const handleNameNext = () => { if (!name.trim()) { setNameError('Obrigatório'); return; } setNameError(''); setStep('pin1'); };
  const handlePin1 = (p: string) => { setPin1(p); setStep('pin2'); };
  const handlePin2 = (p: string) => {
    if (p !== pin1) { setPinError('Os PINs não coincidem.'); setStep('pin1'); setPin1(''); return; }
    onAdd(name.trim(), p);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }} className="bg-white rounded-xl border border-black/[0.06] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-black text-ink uppercase tracking-[0.08em]">Novo Operador</span>
        <button onClick={onCancel} className="w-6 h-6 rounded flex items-center justify-center text-muted hover:bg-black/5 transition-colors">
          <X size={13} weight="bold" />
        </button>
      </div>
      <AnimatePresence mode="wait">
        {step === 'name' && (
          <motion.div key="name" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <label className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] block mb-1.5">Nome do Operador</label>
            <input autoFocus type="text" value={name}
              onChange={e => { setName(e.target.value); setNameError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleNameNext()}
              placeholder="ex: Maria da Silva"
              className={cn('w-full h-10 px-3 rounded-lg border bg-surface text-[13px] font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all',
                nameError ? 'border-danger' : 'border-black/[0.08]')} />
            {nameError && <p className="mt-1 text-[10px] text-danger font-semibold">{nameError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-black/[0.08] text-[12px] font-bold text-muted hover:bg-black/[0.04] transition-colors">Cancelar</button>
              <button onClick={handleNameNext} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-[12px] font-bold hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20">Seguinte</button>
            </div>
          </motion.div>
        )}
        {(step === 'pin1' || step === 'pin2') && (
          <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {pinError && (
              <div className="flex items-center gap-1.5 text-[11px] text-danger font-semibold mb-3">
                <Warning size={11} weight="fill" />{pinError}
              </div>
            )}
            <PINPad label={step === 'pin1' ? 'PIN (4 dígitos)' : 'Confirmar PIN'}
              onComplete={step === 'pin1' ? handlePin1 : handlePin2} onCancel={onCancel} />
            <p className="mt-3 text-[11px] text-muted leading-snug">
              {step === 'pin1' ? `A criar conta para: ${name}` : 'Introduz o PIN novamente para confirmar.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Change PIN form ─────────────────────────────────────────────────────────
function ChangePINForm({ cashierName, onSave, onCancel }: {
  cashierName: string; onSave: (newPin: string) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<'pin1' | 'pin2'>('pin1');
  const [pin1, setPin1] = useState('');
  const [pinError, setPinError] = useState('');

  const handlePin1 = (p: string) => { setPin1(p); setStep('pin2'); };
  const handlePin2 = (p: string) => {
    if (p !== pin1) { setPinError('Os PINs não coincidem.'); setStep('pin1'); setPin1(''); return; }
    onSave(p);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.12 }} className="rounded-xl bg-surface border border-black/[0.06] p-4 mt-3">
      <div className="text-[10px] font-black text-muted uppercase tracking-[0.1em] mb-3">Alterar PIN — {cashierName}</div>
      {pinError && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger font-semibold mb-3">
          <Warning size={11} weight="fill" />{pinError}
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
          <PINPad label={step === 'pin1' ? 'Novo PIN' : 'Confirmar PIN'}
            onComplete={step === 'pin1' ? handlePin1 : handlePin2} onCancel={onCancel} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Delete confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }} className="rounded-xl bg-danger/[0.05] border border-danger/20 p-4 mt-3 space-y-3">
      <div className="flex items-start gap-2">
        <Warning size={13} weight="fill" className="text-danger shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-danger leading-snug">Remover <span className="font-black">{name}</span>? Esta acção não pode ser revertida.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-black/[0.08] text-[11px] font-bold text-muted hover:bg-black/[0.04] transition-colors">Cancelar</button>
        <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-danger text-white text-[11px] font-bold hover:bg-danger/90 transition-colors">Remover</button>
      </div>
    </motion.div>
  );
}

// ─── Cashier row ─────────────────────────────────────────────────────────────
function CashierRow({ cashier, onChangePIN, onRemove, onNotify }: {
  cashier: CashierRecord;
  onChangePIN: (id: string, newPin: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onNotify: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState<'pin' | 'delete' | null>(null);

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-black shrink-0 ${avatarColor(cashier.name)}`}>
          {cashier.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-ink truncate">{cashier.name}</div>
          <div className="text-[10px] text-muted font-medium">Operador de caixa</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e => e === 'pin' ? null : 'pin')} title="Alterar PIN"
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-[11px]',
              expanded === 'pin' ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-black/[0.05] hover:text-ink')}>
            <Key size={14} weight="bold" />
          </button>
          <button onClick={() => setExpanded(e => e === 'delete' ? null : 'delete')} title="Remover"
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              expanded === 'delete' ? 'bg-danger/10 text-danger' : 'text-muted hover:bg-black/[0.05] hover:text-danger')}>
            <Trash size={14} weight="bold" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded === 'pin' && (
          <div className="px-4 pb-4">
            <ChangePINForm cashierName={cashier.name}
              onSave={async (newPin) => {
                const ok = await onChangePIN(cashier.id, newPin);
                if (ok) onNotify(`PIN de ${cashier.name} alterado.`);
                else onNotify('Erro ao alterar PIN.');
                setExpanded(null);
              }}
              onCancel={() => setExpanded(null)} />
          </div>
        )}
        {expanded === 'delete' && (
          <div className="px-4 pb-4">
            <DeleteConfirm name={cashier.name}
              onConfirm={async () => {
                const ok = await onRemove(cashier.id);
                if (ok) onNotify(`${cashier.name} removido.`);
                else onNotify('Erro ao remover operador.');
              }}
              onCancel={() => setExpanded(null)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Module ──────────────────────────────────────────────────────────────────
interface TeamModuleProps {
  cashiers:        CashierRecord[];
  onAddCashier:    (name: string, pin: string) => Promise<CashierRecord | null>;
  onChangePIN:     (id: string, newPin: string) => Promise<boolean>;
  onRemoveCashier: (id: string) => Promise<boolean>;
  onNotify:        (msg: string) => void;
}

export function TeamModule({ cashiers, onAddCashier, onChangePIN, onRemoveCashier, onNotify }: TeamModuleProps) {
  const [adding, setAdding] = useState(false);
  const activeCashiers = cashiers.filter(c => c.role === 'cashier');

  const handleAdd = async (name: string, pin: string) => {
    const record = await onAddCashier(name, pin);
    if (record) onNotify(`Operador "${name}" criado com sucesso.`);
    else onNotify('Erro ao criar operador.');
    setAdding(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-auto bg-canvas">
      <div className="px-6 py-4 border-b border-black/[0.06] bg-white shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black tracking-tight text-ink">Equipa</h2>
          <p className="text-[11px] text-muted font-medium mt-0.5">
            {activeCashiers.length} {activeCashiers.length === 1 ? 'operador' : 'operadores'} configurados
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-accent text-white rounded-lg text-[12px] font-bold hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20">
            <UserPlus size={14} weight="bold" />Novo Operador
          </button>
        )}
      </div>

      <div className="p-6 max-w-lg space-y-3">
        <AnimatePresence>
          {adding && <AddCashierForm onAdd={handleAdd} onCancel={() => setAdding(false)} />}
        </AnimatePresence>

        {activeCashiers.length > 0 ? (
          activeCashiers.map(c => (
            <React.Fragment key={c.id}>
              <CashierRow cashier={c} onChangePIN={onChangePIN} onRemove={onRemoveCashier} onNotify={onNotify} />
            </React.Fragment>
          ))
        ) : !adding ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-black/[0.04] flex items-center justify-center">
              <Users size={28} weight="duotone" className="text-muted" />
            </div>
            <div>
              <p className="text-[14px] font-black text-ink mb-1">Sem operadores</p>
              <p className="text-[12px] text-muted leading-relaxed max-w-[220px]">Clique em "Novo Operador" para adicionar membros da equipa.</p>
            </div>
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 text-accent rounded-lg text-[12px] font-bold hover:bg-accent/15 transition-colors border border-accent/20">
              <UserPlus size={14} weight="bold" />Adicionar Primeiro Operador
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
