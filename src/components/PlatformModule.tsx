import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Buildings, ArrowLeft, Spinner, Warning, ProhibitInset, Key, Backspace,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

// ─── Platform accent colours (indigo / violet) ───────────────────────────────
const P_BG   = 'oklch(0.13 0.018 258)';
const P_PILL = 'oklch(0.48 0.20 280)';
const P_DIM  = 'oklch(0.55 0.06 258)';

// ─── Types ────────────────────────────────────────────────────────────────────
type StoreStatus = 'active' | 'suspended' | 'cancelled';

interface StoreRow {
  store_id:      string;
  store_name:    string;
  status:        StoreStatus;
  total_revenue: number;
  sale_count:    number;
  cashier_count: number;
  created_at:    string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtRevenue(n: number): string {
  if (!n || n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M MT`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k MT`;
  return `${n.toLocaleString('pt')} MT`;
}

function fmtNum(n: number): string {
  return n > 0 ? n.toLocaleString('pt') : '—';
}

function fmtAge(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (days < 1)   return 'Hoje';
  if (days === 1) return '1 dia';
  if (days < 30)  return `${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 mês';
  if (months < 12)  return `${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 ano' : `${years} anos`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StoreStatus }) {
  const cfg = {
    active:    { dot: 'bg-success',  label: 'Activo',    pill: 'bg-[oklch(0.94_0.06_140)] text-[oklch(0.32_0.14_140)]' },
    suspended: { dot: 'bg-warning',  label: 'Suspenso',  pill: 'bg-[oklch(0.94_0.07_75)]  text-[oklch(0.38_0.14_60)]'  },
    cancelled: { dot: 'bg-danger',   label: 'Cancelado', pill: 'bg-[oklch(0.94_0.05_20)]  text-[oklch(0.38_0.14_22)]'  },
  }[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold', cfg.pill)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Kill-switch toggle ───────────────────────────────────────────────────────
function KillToggle({
  status, onToggle, busy,
}: { status: StoreStatus; onToggle: () => void; busy: boolean }) {
  const active    = status === 'active';
  const cancelled = status === 'cancelled';
  return (
    <button
      role="switch"
      aria-checked={active}
      onClick={cancelled || busy ? undefined : onToggle}
      disabled={cancelled || busy}
      title={cancelled ? 'Conta cancelada' : active ? 'Suspender sistema' : 'Reativar sistema'}
      className={cn(
        'relative h-5 w-9 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        active    ? 'bg-success focus-visible:ring-success/40' :
        cancelled ? 'bg-black/10 opacity-30 cursor-not-allowed' :
                    'bg-warning/50 focus-visible:ring-warning/40',
        busy && 'opacity-50 cursor-wait',
      )}>
      <span className={cn(
        'absolute top-[3px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-200',
        active ? 'left-[19px]' : 'left-[3px]',
      )} />
    </button>
  );
}

// ─── Mini PIN pad (4-digit, inline) ──────────────────────────────────────────
function MiniPinPad({ onComplete, onCancel }: {
  onComplete: (pin: string) => void;
  onCancel:   () => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const press = (d: string) => {
    const next = [...digits, d].slice(0, 4);
    setDigits(next);
    if (next.length === 4) onComplete(next.join(''));
  };
  const back = () => setDigits(d => d.slice(0, -1));
  return (
    <div>
      <div className="flex gap-2 mb-2 justify-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < digits.length ? 'bg-accent' : 'bg-black/10'}`} />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {['1','2','3','4','5','6','7','8','9','0'].map(k => (
          <button key={k} onClick={() => press(k)}
            className="h-8 rounded-lg bg-white border border-black/[0.06] text-[12px] font-black text-ink hover:bg-surface active:scale-95 transition-all">
            {k}
          </button>
        ))}
        <button onClick={back} disabled={digits.length === 0}
          className="h-8 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center hover:bg-surface active:scale-95 transition-all disabled:opacity-25 col-span-2">
          <Backspace size={12} weight="bold" className="text-muted" />
        </button>
      </div>
      <button onClick={onCancel} className="mt-2 text-[10px] text-muted hover:text-ink font-semibold transition-colors">Cancelar</button>
    </div>
  );
}

// ─── Store card ───────────────────────────────────────────────────────────────
function StoreCard({
  store, onToggle, onCancel, onResetPin, busy,
}: {
  store:       StoreRow;
  onToggle:    () => void | Promise<void>;
  onCancel:    () => void | Promise<void>;
  onResetPin:  (newPin: string) => Promise<void>;
  busy:        boolean;
}) {
  const [confirming,    setConfirming]    = useState(false);
  const [resettingPin,  setResettingPin]  = useState(false);
  const [pinBusy,       setPinBusy]       = useState(false);
  const [pinDone,       setPinDone]       = useState(false);
  const [pinError,      setPinError]      = useState('');

  const handleResetPin = async (newPin: string) => {
    setPinBusy(true);
    setPinError('');
    try {
      await onResetPin(newPin);
      setPinDone(true);
      setTimeout(() => { setResettingPin(false); setPinDone(false); }, 1800);
    } catch (e: any) {
      setPinError(e.message ?? 'Erro ao repor senha');
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border border-black/[0.06] overflow-hidden transition-shadow',
      store.status !== 'cancelled' && 'hover:shadow-sm',
      store.status === 'cancelled' && 'opacity-60',
    )}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-ink leading-tight truncate">{store.store_name}</div>
            <div className="text-[11px] text-muted font-medium mt-0.5">Há {fmtAge(store.created_at)}</div>
          </div>
          <StatusBadge status={store.status} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: 'Receita',    value: fmtRevenue(store.total_revenue) },
            { label: 'Vendas',     value: fmtNum(store.sale_count) },
            { label: 'Operadores', value: fmtNum(store.cashier_count) },
          ].map(m => (
            <div key={m.label} className="bg-surface rounded-lg py-2 px-2 text-center">
              <div className="text-[9px] text-muted font-bold uppercase tracking-wide leading-none mb-1">{m.label}</div>
              <div className="text-[12px] font-black text-ink leading-none">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Kill switch row */}
        <div className="flex items-center justify-between pt-3 border-t border-black/[0.05]">
          <span className={cn('text-[11px] font-medium',
            store.status === 'active'    ? 'text-success' :
            store.status === 'suspended' ? 'text-warning'  : 'text-muted')}>
            {store.status === 'active'    ? 'Sistema activo' :
             store.status === 'suspended' ? 'Sistema suspenso' : 'Conta cancelada'}
          </span>
          <div className="flex items-center gap-3">
            {store.status !== 'cancelled' && !confirming && !resettingPin && (
              <button
                onClick={() => { setResettingPin(true); setPinDone(false); setPinError(''); }}
                className="text-[10px] font-bold text-muted/60 hover:text-accent transition-colors"
                title="Repor senha de administrador"
              >
                <Key size={11} weight="bold" className="inline mr-0.5" />
                Repor Senha
              </button>
            )}
            {store.status === 'suspended' && !confirming && !resettingPin && (
              <button
                onClick={() => setConfirming(true)}
                className="text-[10px] font-bold text-danger/60 hover:text-danger transition-colors underline underline-offset-2"
              >
                Cancelar Conta
              </button>
            )}
            <KillToggle status={store.status} onToggle={onToggle} busy={busy} />
          </div>
        </div>
      </div>

      {/* ── Reset PIN panel ── */}
      <AnimatePresence>
        {resettingPin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 rounded-xl bg-accent/[0.04] border border-accent/15 p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <Key size={12} weight="bold" className="text-accent shrink-0" />
                <p className="text-[11px] font-semibold text-ink leading-snug">
                  Nova senha para <span className="font-black">{store.store_name}</span>
                </p>
              </div>
              {pinDone ? (
                <p className="text-[11px] font-bold text-success text-center py-2">Senha reposta com sucesso</p>
              ) : (
                <>
                  {pinError && (
                    <p className="text-[10px] text-danger font-semibold mb-2">{pinError}</p>
                  )}
                  {pinBusy ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-muted">
                      <Spinner size={14} className="animate-spin" />
                      <span className="text-[11px] font-semibold">A repor…</span>
                    </div>
                  ) : (
                    <MiniPinPad
                      onComplete={handleResetPin}
                      onCancel={() => { setResettingPin(false); setPinError(''); }}
                    />
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cancel confirmation panel ── */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 rounded-xl bg-danger/[0.05] border border-danger/20 p-3.5 space-y-3">
              <div className="flex items-start gap-2">
                <ProhibitInset size={14} weight="fill" className="text-danger shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-danger leading-snug">
                  Cancelar <span className="font-black">{store.store_name}</span>?
                  O acesso será bloqueado permanentemente. Esta acção é irreversível.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2 rounded-lg border border-black/[0.08] text-[11px] font-bold text-muted hover:bg-black/[0.04] transition-colors"
                >
                  Manter Suspenso
                </button>
                <button
                  onClick={async () => { setConfirming(false); await onCancel(); }}
                  disabled={busy}
                  className="flex-1 py-2 rounded-lg bg-danger text-white text-[11px] font-bold hover:bg-danger/90 transition-colors disabled:opacity-50"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  adminName: string;
  onLogout:  () => void;
}

export function PlatformModule({ adminName, onLogout }: Props) {
  const [stores,   setStores]   = useState<StoreRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [busyId,   setBusyId]   = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('list_all_stores');
      if (rpcErr) throw rpcErr;
      setStores((data as StoreRow[]) ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStores(); }, [loadStores]);

  const setStatus = async (store: StoreRow, newStatus: StoreStatus) => {
    if (busyId) return;
    setBusyId(store.store_id);
    try {
      const { error: rpcErr } = await supabase.rpc('set_store_status', {
        p_store_id: store.store_id,
        p_status:   newStatus,
      });
      if (rpcErr) throw rpcErr;
      setStores(prev => prev.map(s =>
        s.store_id === store.store_id ? { ...s, status: newStatus } : s,
      ));
    } catch (e: any) {
      setError(e.message ?? 'Erro ao alterar estado');
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = (store: StoreRow) => {
    if (store.status === 'cancelled') return;
    const next: StoreStatus = store.status === 'active' ? 'suspended' : 'active';
    return setStatus(store, next);
  };

  const cancelStore = (store: StoreRow) => setStatus(store, 'cancelled');

  const resetAdminPin = async (store: StoreRow, newPin: string) => {
    const { error: rpcErr } = await supabase.rpc('reset_admin_pin', {
      p_store_id: store.store_id,
      p_new_pin:  newPin,
    });
    if (rpcErr) throw rpcErr;
  };

  const nActive    = stores.filter(s => s.status === 'active').length;
  const nSuspended = stores.filter(s => s.status === 'suspended').length;
  const totalRev   = stores.reduce((sum, s) => sum + (s.total_revenue ?? 0), 0);

  const STATS = [
    { label: 'Total de Lojas',     value: loading ? '…' : stores.length.toString(), color: 'text-ink'     },
    { label: 'Activas',            value: loading ? '…' : nActive.toString(),        color: 'text-success' },
    { label: 'Suspensas',          value: loading ? '…' : nSuspended.toString(),     color: 'text-warning' },
    { label: 'Receita (total)',     value: loading ? '…' : fmtRevenue(totalRev),      color: 'text-accent', small: true },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Platform header band ──────────────────────────────── */}
      <div className="px-5 py-3 flex items-center justify-between shrink-0"
        style={{ background: P_BG }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: P_PILL }}>
            <Buildings size={15} weight="fill" className="text-white" />
          </div>
          <div>
            <div className="text-[11px] font-black text-white tracking-widest uppercase">
              Lumina Systems
            </div>
            <div className="text-[9.5px] font-medium" style={{ color: P_DIM }}>
              Painel de Operações
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[11px]" style={{ color: P_DIM }}>
            Operador: <span className="text-white font-semibold">{adminName}</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'oklch(0.22 0.02 258)', color: 'oklch(0.65 0.05 258)' }}
            onMouseEnter={e => Object.assign(e.currentTarget.style, {
              background: 'oklch(0.28 0.03 258)', color: 'oklch(0.82 0.07 258)',
            })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, {
              background: 'oklch(0.22 0.02 258)', color: 'oklch(0.65 0.05 258)',
            })}
          >
            <ArrowLeft size={11} weight="bold" />
            Voltar à Loja
          </button>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-5 space-y-5">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-danger/8 border border-danger/20 rounded-xl px-4 py-3 text-[12px] text-danger font-semibold">
            <Warning size={14} weight="fill" className="shrink-0" />
            {error}
            <button onClick={loadStores} className="ml-auto text-[11px] underline underline-offset-2 font-bold">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-black/[0.06] px-4 py-3.5">
              <div className="text-[9.5px] font-black text-muted uppercase tracking-widest mb-1.5">
                {s.label}
              </div>
              <div className={cn('font-black leading-none tabular-nums', s.color,
                s.small ? 'text-[17px]' : 'text-[28px]')}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Stores grid */}
        <div>
          <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-2.5">
            Lojas {!loading && `(${stores.length})`}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted">
              <Spinner size={20} className="animate-spin" />
              <span className="text-[13px] font-semibold">A carregar lojas…</span>
            </div>
          ) : stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Buildings size={32} weight="light" className="text-muted/40" />
              <p className="text-[13px] text-muted font-semibold">Nenhuma loja registada</p>
              <p className="text-[11px] text-muted/60">As lojas aparecerão aqui após o registo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stores.map((store: StoreRow) => (
                <React.Fragment key={store.store_id}>
                  <StoreCard
                    store={store}
                    onToggle={() => toggleStatus(store)}
                    onCancel={() => cancelStore(store)}
                    onResetPin={(pin) => resetAdminPin(store, pin)}
                    busy={busyId === store.store_id}
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
