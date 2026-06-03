"use client";

import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Barcode, Trash, Plus, Minus, X,
  CurrencyCircleDollar, ArrowCounterClockwise, Warning, CheckCircle, ChartLineUp, CaretDown,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product, CartItem, Sale } from '../types';
import { buildBarcodeMap, PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../data/mockData';
import { playBeep } from '../hooks/useBarcodeScanner';
import { printReceipt } from '../lib/receiptPrinter';

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

// ─── Modal wrapper — NO backdrop-blur, fast tween ────────────────────────────
function ModalShell({
  onClose, children, maxW = 'max-w-md',
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={`relative w-full ${maxW} bg-white rounded-xl shadow-xl border border-black/[0.07] overflow-hidden`}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─── Cash payment dialog ──────────────────────────────────────────────────────
function CashModal({
  total, onComplete, onClose,
}: { total: number; onComplete: (received: number) => void; onClose: () => void }) {
  const [received, setReceived] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const num    = parseFloat(received) || 0;
  const change = num - total;

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60">
        <div className="flex items-center gap-2">
          <CurrencyCircleDollar size={17} weight="bold" className="text-accent" />
          <span className="font-black text-[13px] uppercase tracking-wider">Pagamento em Dinheiro</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
          <X size={14} weight="bold" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between bg-surface rounded-lg px-4 py-3">
          <span className="text-[11px] font-black text-muted uppercase tracking-wider">Total</span>
          <span className="text-xl font-black text-ink num">{total.toFixed(2)} MT</span>
        </div>

        <div>
          <label className="field-label">Valor Recebido (MT)</label>
          <input
            ref={inputRef}
            type="number" min={0} step={0.01}
            value={received}
            onChange={e => setReceived(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && num >= total) onComplete(num); }}
            className="w-full px-4 py-3 bg-surface border-2 border-accent/30 focus:border-accent rounded-lg text-2xl font-black text-accent num focus:outline-none transition-colors"
            placeholder={total.toFixed(2)}
          />
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[50, 100, 200, 500, 1000].map(v => (
            <button key={v} onClick={() => setReceived(v.toString())}
              className="h-11 rounded-lg bg-surface hover:bg-black/10 active:bg-black/15 text-sm font-bold num transition-colors border border-black/[0.06]">
              {v}
            </button>
          ))}
        </div>

        <button onClick={() => setReceived(total.toFixed(2))}
          className="w-full py-2 rounded-lg border border-black/[0.07] text-xs font-semibold text-muted hover:bg-surface transition-colors">
          Quantia Exata
        </button>

        {change > 0 && (
          <div className="flex items-center justify-between bg-success/8 border border-success/20 rounded-lg px-4 py-2.5">
            <span className="text-xs font-black text-success uppercase tracking-wider">Troco</span>
            <span className="text-xl font-black text-success num">{change.toFixed(2)} MT</span>
          </div>
        )}

        <button
          disabled={num < total}
          onClick={() => onComplete(num)}
          className="w-full h-12 bg-success text-white rounded-lg font-black text-sm hover:bg-success/90 transition-all shadow-md shadow-success/20 disabled:opacity-30 disabled:shadow-none"
        >
          Concluir Venda · Enter
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Mobile-money confirm (manual — no STK push). One shell, two providers ───
type MobileMoneyMethod = 'mpesa' | 'emola';
const MOBILE_MONEY: Record<MobileMoneyMethod, { label: string; brandClass: string }> = {
  mpesa: { label: 'M-Pesa', brandClass: 'text-mpesa' },
  emola: { label: 'Emola',  brandClass: 'text-emola' },
};

function MobileMoneyConfirmModal({
  method, total, onConfirm, onClose,
}: { method: MobileMoneyMethod; total: number; onConfirm: () => void; onClose: () => void }) {
  const { label, brandClass } = MOBILE_MONEY[method];
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60">
        <div className="flex items-center gap-2">
          <CurrencyCircleDollar size={17} weight="bold" className={brandClass} />
          <span className="font-black text-[13px] uppercase tracking-wider">Pagamento {label}</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
          <X size={14} weight="bold" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between bg-surface rounded-lg px-4 py-3">
          <span className="text-[11px] font-black text-muted uppercase tracking-wider">Total a Receber</span>
          <span className="text-xl font-black text-ink num">{total.toFixed(2)} MT</span>
        </div>
        <p className="text-[12px] text-muted font-medium leading-relaxed text-center">
          Confirme que o cliente efectuou a transferência {label} antes de concluir a venda.
        </p>
        <button
          onClick={onConfirm}
          className="w-full h-12 bg-success text-white rounded-lg font-black text-sm hover:bg-success/90 transition-all shadow-md shadow-success/20"
        >
          Confirmar Pagamento Recebido
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Add product modal (barcode not found) ────────────────────────────────────
function AddProductModal({
  barcode, onAdd, onClose,
}: { barcode: string; onAdd: (p: Product) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', price: '', costPrice: '', stock: '0', minStock: '5',
    category: 'Outros', unit: 'Un',
  });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handle = () => {
    if (!form.name || !form.price) return;
    onAdd({
      id: crypto.randomUUID(), barcode,
      name: form.name, price: parseFloat(form.price),
      costPrice: parseFloat(form.costPrice) || 0,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 5,
      category: form.category, unit: form.unit,
    });
  };

  return (
    <ModalShell onClose={onClose} maxW="max-w-lg">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60">
        <div className="flex items-center gap-3">
          <span className="font-black text-[13px] uppercase tracking-wider">Novo Produto</span>
          <span className="font-mono text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded num">{barcode}</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
          <X size={14} weight="bold" />
        </button>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="field-label">Nome do Produto *</label>
          <input autoFocus className="field-input" placeholder="ex. Paracetamol 500mg"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Preço Venda (MT) *</label>
          <input type="number" className="field-input" placeholder="0.00"
            value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Preço Custo (MT)</label>
          <input type="number" className="field-input" placeholder="0.00"
            value={form.costPrice} onChange={e => set('costPrice', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Stock Inicial</label>
          <input type="number" className="field-input" placeholder="0"
            value={form.stock} onChange={e => set('stock', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Stock Mínimo</label>
          <input type="number" className="field-input" placeholder="5"
            value={form.minStock} onChange={e => set('minStock', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Categoria</label>
          <select className="field-input" value={form.category} onChange={e => set('category', e.target.value)}>
            {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Unidade</label>
          <select className="field-input" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {PRODUCT_UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="px-5 pb-5 flex gap-2">
        <button onClick={onClose}
          className="flex-1 h-11 rounded-lg border border-black/[0.08] font-bold text-sm hover:bg-surface transition-colors">
          Cancelar
        </button>
        <button disabled={!form.name || !form.price} onClick={handle}
          className="flex-[2] h-11 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-colors shadow-md shadow-accent/20 disabled:opacity-30 disabled:shadow-none">
          Guardar e Adicionar ao Carrinho
        </button>
      </div>
    </ModalShell>
  );
}

// ─── End-of-shift summary ─────────────────────────────────────────────────────
function EndOfShiftModal({ sales, onClose }: { sales: Sale[]; onClose: () => void }) {
  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const cashRevenue  = sales.filter(x => x.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
  const mpesaRevenue = sales.filter(x => x.paymentMethod === 'mpesa').reduce((s, x) => s + x.total, 0);
  const emolaRevenue = sales.filter(x => x.paymentMethod === 'emola').reduce((s, x) => s + x.total, 0);
  const totalItems   = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0), 0);
  const avgBasket    = sales.length > 0 ? totalRevenue / sales.length : 0;

  // Top products by qty sold
  const productQty: Record<string, { name: string; qty: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!productQty[item.productId]) productQty[item.productId] = { name: item.name, qty: 0 };
      productQty[item.productId].qty += item.quantity;
    }
  }
  const topProducts = Object.values(productQty).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <ModalShell onClose={onClose} maxW="max-w-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-black/[0.06] bg-surface/50">
        <div className="text-[10px] font-black text-muted uppercase tracking-[0.14em] mb-0.5">Resumo do Turno</div>
        <div className="text-[13px] font-black text-ink">
          {sales.length} {sales.length === 1 ? 'venda' : 'vendas'}
          <span className="text-muted font-semibold ml-2 text-[11px] normal-case">{totalItems} artigos vendidos</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Revenue total */}
        <div className="rounded-xl bg-ink p-4 text-white text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60 mb-1">Receita Total</div>
          <div className="text-[36px] font-black tabular-nums leading-none">
            {totalRevenue.toFixed(2)}
            <span className="text-[18px] ml-1.5 opacity-60">MT</span>
          </div>
          {sales.length > 0 && (
            <div className="text-[11px] opacity-50 mt-1.5 tabular-nums">
              média {avgBasket.toFixed(2)} MT / venda
            </div>
          )}
        </div>

        {/* Method split — 3-up for cash / M-Pesa / Emola */}
        {sales.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-surface border border-black/[0.06] p-3 text-center">
              <div className="text-[9px] font-black text-muted uppercase tracking-[0.12em] mb-1">Dinheiro</div>
              <div className="text-[18px] font-black text-ink tabular-nums leading-none">
                {cashRevenue.toFixed(0)}
                <span className="text-[10px] ml-0.5 text-muted">MT</span>
              </div>
              <div className="text-[10px] text-muted mt-0.5">
                {sales.filter(x => x.paymentMethod === 'cash').length} vendas
              </div>
            </div>
            <div className="rounded-xl bg-mpesa/[0.07] border border-mpesa/20 p-3 text-center">
              <div className="text-[9px] font-black text-mpesa/85 uppercase tracking-[0.12em] mb-1">M-Pesa</div>
              <div className="text-[18px] font-black text-mpesa tabular-nums leading-none">
                {mpesaRevenue.toFixed(0)}
                <span className="text-[10px] ml-0.5 text-mpesa/70">MT</span>
              </div>
              <div className="text-[10px] text-mpesa/70 mt-0.5">
                {sales.filter(x => x.paymentMethod === 'mpesa').length} vendas
              </div>
            </div>
            <div className="rounded-xl bg-emola/[0.08] border border-emola/25 p-3 text-center">
              <div className="text-[9px] font-black text-emola/85 uppercase tracking-[0.12em] mb-1">Emola</div>
              <div className="text-[18px] font-black text-emola tabular-nums leading-none">
                {emolaRevenue.toFixed(0)}
                <span className="text-[10px] ml-0.5 text-emola/70">MT</span>
              </div>
              <div className="text-[10px] text-emola/70 mt-0.5">
                {sales.filter(x => x.paymentMethod === 'emola').length} vendas
              </div>
            </div>
          </div>
        )}

        {/* Top products */}
        {topProducts.length > 0 && (
          <div>
            <div className="text-[10px] font-black text-muted uppercase tracking-[0.12em] mb-2">Mais Vendidos</div>
            <div className="space-y-1.5">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-muted/50 w-4 shrink-0">{i + 1}</span>
                  <span className="text-[12px] font-semibold text-ink flex-1 truncate">{p.name}</span>
                  <span className="text-[11px] font-black text-ink tabular-nums shrink-0">{p.qty} un.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sales.length === 0 && (
          <p className="text-center text-[13px] text-muted/60 py-4">Nenhuma venda neste turno.</p>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          autoFocus
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-black/[0.08] font-bold text-[12px] uppercase tracking-wider text-muted hover:bg-black/[0.04] hover:text-ink transition-all"
        >
          Fechar
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Payment success flash ────────────────────────────────────────────────────
function PaymentFlash({ method, total }: { method: 'cash' | 'mpesa' | 'emola'; total: number }) {
  const label =
    method === 'mpesa' ? 'M-Pesa Confirmado' :
    method === 'emola' ? 'Emola Confirmado' :
                         'Pagamento Recebido';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[5000] bg-success flex items-center justify-center select-none"
    >
      <motion.div
        initial={{ scale: 0.72, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5 text-white"
      >
        <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center">
          <CheckCircle size={52} weight="fill" />
        </div>
        <div className="text-center">
          <div className="leading-none font-black tabular-nums text-[52px]">
            {total.toFixed(2)}
            <span className="text-[26px] ml-2 font-bold opacity-75">MT</span>
          </div>
          <div className="text-[12px] font-black uppercase tracking-[0.22em] mt-3 opacity-70">
            {label}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sale receipt ─────────────────────────────────────────────────────────────
function ReceiptModal({ sale, change, storeName, onClose }: { sale: Sale; change: number; storeName: string; onClose: () => void }) {
  const methodLabel =
    sale.paymentMethod === 'mpesa' ? 'M-Pesa' :
    sale.paymentMethod === 'emola' ? 'Emola'  :
                                     'Dinheiro';
  const methodPillClass =
    sale.paymentMethod === 'mpesa' ? 'bg-mpesa/10 text-mpesa' :
    sale.paymentMethod === 'emola' ? 'bg-emola/12 text-emola' :
                                     'bg-ink/[0.07] text-ink';
  const timeStr = new Date(sale.timestamp).toLocaleTimeString('pt', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  return (
    <ModalShell onClose={onClose} maxW="max-w-[360px]">
      {/* Success header */}
      <div className="px-5 pt-5 pb-4 text-center border-b border-black/[0.06] bg-success/[0.03]">
        <div className="w-11 h-11 rounded-full bg-success/12 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={22} weight="fill" className="text-success" />
        </div>
        <div className="text-[10px] font-black text-muted uppercase tracking-[0.12em] mb-1">Venda Concluída</div>
        <div className="text-[28px] font-black text-ink leading-none tracking-tight">#{sale.number}</div>
        <div className="text-[11px] text-muted font-mono mt-1">{timeStr}</div>
      </div>

      {/* Items */}
      <div className="max-h-[176px] overflow-y-auto">
        <table className="w-full">
          <tbody className="divide-y divide-black/[0.04]">
            {sale.items.map(item => (
              <tr key={item.productId}>
                <td className="px-4 py-2 text-[12px] font-semibold text-ink leading-tight">{item.name}</td>
                <td className="px-3 py-2 text-center text-[11px] text-muted tabular-nums whitespace-nowrap">{item.quantity}×</td>
                <td className="px-4 py-2 text-right text-[13px] font-bold text-ink tabular-nums whitespace-nowrap">{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals block */}
      <div className="mx-4 my-3 rounded-xl bg-ink overflow-hidden">
        <div className="px-4 py-3 flex justify-between items-center text-white">
          <span className="text-[12px] font-black uppercase tracking-wider">Total</span>
          <span className="text-[24px] font-black tabular-nums leading-none">{sale.total.toFixed(2)} MT</span>
        </div>
      </div>

      {/* Payment method + change */}
      <div className="px-4 pb-3 flex items-center justify-between min-h-[44px]">
        <span className={cn(
          'text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-full',
          methodPillClass,
        )}>
          {methodLabel}
        </span>
        {change > 0 && (
          <div className="text-right">
            <div className="text-[9px] font-black text-muted uppercase tracking-[0.1em]">Troco</div>
            <div className="text-[22px] font-black text-success tabular-nums leading-none">{change.toFixed(2)} MT</div>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="px-4 pb-4 space-y-2">
        <button
          onClick={() => printReceipt(sale, storeName, change > 0 ? change : undefined)}
          className="w-full py-2.5 rounded-xl border border-black/[0.08] font-bold text-[12px] uppercase tracking-wider text-muted hover:bg-black/[0.04] hover:text-ink transition-all flex items-center justify-center gap-2"
        >
          <Barcode size={14} weight="bold" />
          Imprimir Recibo
        </button>
        <button
          autoFocus
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-ink text-white font-black text-[13px] uppercase tracking-widest hover:bg-ink/80 active:scale-[0.98] transition-all"
        >
          Nova Venda
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Cart row ─────────────────────────────────────────────────────────────────
interface CartRowProps {
  item: CartItem; index: number; flash: boolean;
  onQtyChange: (id: string, qty: number) => void;
  onRemove:    (id: string) => void;
  key?: React.Key;
}
function CartRow({ item, index, flash, onQtyChange, onRemove }: CartRowProps) {
  return (
    <tr className={cn('transition-colors duration-100', flash ? 'bg-success/10' : 'hover:bg-surface/60')}>
      <td className="py-2.5 px-3 text-center text-xs font-mono text-muted/60 num">{index + 1}</td>
      <td className="py-2.5 px-3">
        <div className="font-bold text-[15px] text-ink leading-snug">{item.name}</div>
      </td>
      <td className="py-2.5 px-3 text-center text-[11px] font-mono text-muted/70">{item.unit}</td>
      <td className="py-2.5 px-3 text-right text-[13px] font-semibold text-muted num">{item.price.toFixed(2)}</td>
      <td className="py-1.5 px-2">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onQtyChange(item.productId, item.quantity - 1)}
            aria-label="Diminuir quantidade"
            className="w-11 h-11 rounded-lg flex items-center justify-center bg-surface text-ink hover:bg-black/10 active:bg-black/15 transition-colors">
            <Minus size={16} weight="bold" />
          </button>
          <input
            type="number" min={1} value={item.quantity}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onQtyChange(item.productId, v); }}
            aria-label="Quantidade"
            className="w-12 h-11 text-center text-[15px] font-black num bg-canvas border border-black/[0.08] rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
          <button
            onClick={() => onQtyChange(item.productId, item.quantity + 1)}
            aria-label="Aumentar quantidade"
            className="w-11 h-11 rounded-lg flex items-center justify-center bg-surface text-ink hover:bg-black/10 active:bg-black/15 transition-colors">
            <Plus size={16} weight="bold" />
          </button>
        </div>
      </td>
      <td className="py-2.5 px-3 text-right text-[18px] font-black text-ink num leading-none">{item.subtotal.toFixed(2)}</td>
      <td className="py-1.5 px-2 text-center">
        <button
          onClick={() => onRemove(item.productId)}
          aria-label="Remover artigo"
          className="w-11 h-11 rounded-lg flex items-center justify-center text-muted hover:bg-danger/10 hover:text-danger active:bg-danger/15 transition-colors">
          <Trash size={16} weight="bold" />
        </button>
      </td>
    </tr>
  );
}

// ─── Main POS ─────────────────────────────────────────────────────────────────
export interface POSModuleProps {
  products:       Product[];
  sales:          Sale[];
  saleNo?:        number;
  onNotify:       (msg: string) => void;
  onAddProduct:   (p: Product) => void;
  onSaleComplete: (s: Sale) => void;
  currentUserId?:   string | null;
  currentUserName?: string | null;
  storeName?:       string;
  onOpenReturns?:   () => void;
  onOpenReconciliation?: () => void;
  t:              any;
}

export function POSModule({ products, sales, saleNo: saleNoProp, onNotify, onAddProduct, onSaleComplete, currentUserId, currentUserName, storeName, onOpenReturns, onOpenReconciliation }: POSModuleProps) {
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [query,         setQuery]         = useState('');
  const [suggestions,   setSuggestions]   = useState<Product[]>([]);
  const [flashId,       setFlashId]       = useState<string | null>(null);
  const [notFound,      setNotFound]      = useState<string | null>(null);
  const [cashOpen,      setCashOpen]      = useState(false);
  const [mpesaOpen,     setMpesaOpen]     = useState(false);
  const [emolaOpen,     setEmolaOpen]     = useState(false);
  const [saleNo,        setSaleNo]        = useState(saleNoProp ?? 1);

  // Sync when the parent (App.tsx) updates the next sale number from the backend
  useEffect(() => {
    if (saleNoProp && saleNoProp > saleNo) setSaleNo(saleNoProp);
  }, [saleNoProp]);
  const [completedSale, setCompletedSale] = useState<{ sale: Sale; change: number } | null>(null);
  const [paymentFlash,  setPaymentFlash]  = useState<{ method: 'cash' | 'mpesa' | 'emola'; total: number } | null>(null);
  const [shiftOpen,     setShiftOpen]     = useState(false);
  const [shiftMenuOpen, setShiftMenuOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const shiftMenuRef    = useRef<HTMLDivElement>(null);
  const barcodeMap      = useMemo(() => buildBarcodeMap(products), [products]);

  // Close the shift menu when clicking outside
  useEffect(() => {
    if (!shiftMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (shiftMenuRef.current && !shiftMenuRef.current.contains(e.target as Node)) {
        setShiftMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [shiftMenuOpen]);

  // Assigned synchronously during render (not in an effect) so the value is
  // already current when autoFocus triggers blur on the barcode input during
  // the same DOM-commit cycle that opens the modal.
  const anyModalOpen = useRef(false);
  anyModalOpen.current = !!(cashOpen || mpesaOpen || emolaOpen || notFound || completedSale || paymentFlash || shiftOpen);

  const focusBarcode = useCallback(() => {
    setTimeout(() => barcodeInputRef.current?.focus(), 30);
  }, []);

  useEffect(() => { focusBarcode(); }, [focusBarcode]);

  const flashRow = useCallback((productId: string) => {
    setFlashId(productId);
    setTimeout(() => setFlashId(null), 500);
  }, []);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: i.price * (i.quantity + 1) }
          : i);
      }
      return [...prev, {
        productId: product.id, barcode: product.barcode, name: product.name,
        price: product.price, quantity: 1, discount: 0,
        subtotal: product.price, unit: product.unit,
      }];
    });
    flashRow(product.id);
    playBeep('ok');
    setQuery('');
    setSuggestions([]);
    focusBarcode();
  }, [flashRow, focusBarcode]);

  const handleQuery = useCallback((val: string) => {
    setQuery(val);
    if (!val.trim()) { setSuggestions([]); return; }

    const exact = barcodeMap.get(val.trim());
    if (exact) { addToCart(exact); return; }

    const q = val.toLowerCase();
    setSuggestions(
      products.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q)).slice(0, 8)
    );
  }, [barcodeMap, products, addToCart]);

  const handleBarcodeKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = query.trim();
      if (!v) return;
      const exact = barcodeMap.get(v);
      if (exact) { addToCart(exact); return; }
      if (suggestions.length > 0) { addToCart(suggestions[0]); return; }
      if (v.length >= 3) { setNotFound(v); setQuery(''); setSuggestions([]); }
    }
    if (e.key === 'Escape')  { setQuery(''); setSuggestions([]); }
    if (e.key === 'F4')      { e.preventDefault(); if (cart.length > 0) setCashOpen(true); }
    if (e.key === 'F5')      { e.preventDefault(); if (cart.length > 0) setMpesaOpen(true); }
    if (e.key === 'F6')      { e.preventDefault(); if (cart.length > 0) setEmolaOpen(true); }
    if (e.key === 'F1')      { e.preventDefault(); clearCart(); }
  }, [query, barcodeMap, addToCart, suggestions, cart]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'F4') { e.preventDefault(); if (cart.length > 0) setCashOpen(true); }
      if (e.key === 'F5') { e.preventDefault(); if (cart.length > 0) setMpesaOpen(true); }
      if (e.key === 'F6') { e.preventDefault(); if (cart.length > 0) setEmolaOpen(true); }
      if (e.key === 'F1') { e.preventDefault(); clearCart(); }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [cart]);

  const updateQty = useCallback((productId: string, qty: number) => {
    setCart(prev =>
      qty <= 0
        ? prev.filter(i => i.productId !== productId)
        : prev.map(i => i.productId === productId ? { ...i, quantity: qty, subtotal: i.price * qty } : i)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
    focusBarcode();
  }, [focusBarcode]);

  const clearCart = useCallback(() => {
    setCart([]); setQuery(''); setSuggestions([]); focusBarcode();
  }, [focusBarcode]);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.subtotal, 0), [cart]);
  const tax      = 0;
  const total    = subtotal;

  const completeSale = useCallback((method: 'cash' | 'mpesa' | 'emola', receivedAmount?: number) => {
    const sale: Sale = {
      id: crypto.randomUUID(), number: saleNo,
      items: [...cart], subtotal, tax, total,
      paymentMethod: method, timestamp: new Date(),
      cashierId:   currentUserId   ?? null,
      cashierName: currentUserName ?? null,
    };
    onSaleComplete(sale);
    setSaleNo(n => n + 1);
    setCart([]);
    setCashOpen(false);
    setMpesaOpen(false);
    setEmolaOpen(false);
    const change = receivedAmount !== undefined ? Math.max(0, receivedAmount - total) : 0;
    // Flash and receipt open together; flash clears after 1 s, revealing receipt underneath
    setPaymentFlash({ method, total });
    setCompletedSale({ sale, change });
    setTimeout(() => setPaymentFlash(null), 1000);
  }, [cart, subtotal, total, saleNo, onSaleComplete, currentUserId, currentUserName]);

  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      {/* ── Modals ── */}
      <AnimatePresence>
        {cashOpen && (
          <CashModal
            total={total}
            onComplete={(received) => completeSale('cash', received)}
            onClose={() => { setCashOpen(false); focusBarcode(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mpesaOpen && (
          <MobileMoneyConfirmModal
            method="mpesa"
            total={total}
            onConfirm={() => completeSale('mpesa')}
            onClose={() => { setMpesaOpen(false); focusBarcode(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emolaOpen && (
          <MobileMoneyConfirmModal
            method="emola"
            total={total}
            onConfirm={() => completeSale('emola')}
            onClose={() => { setEmolaOpen(false); focusBarcode(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notFound && (
          <AddProductModal
            barcode={notFound}
            onAdd={p => {
              onAddProduct(p);
              addToCart(p);
              setNotFound(null);
              onNotify(`Produto "${p.name}" criado e adicionado.`);
            }}
            onClose={() => { setNotFound(null); focusBarcode(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {completedSale && (
          <ReceiptModal
            sale={completedSale.sale}
            change={completedSale.change}
            storeName={storeName ?? 'Vela POS'}
            onClose={() => { setCompletedSale(null); focusBarcode(); }}
          />
        )}
      </AnimatePresence>

      {/* Flash sits above the receipt — clears automatically after 1 s */}
      <AnimatePresence>
        {paymentFlash && (
          <PaymentFlash method={paymentFlash.method} total={paymentFlash.total} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shiftOpen && (
          <EndOfShiftModal
            sales={sales}
            onClose={() => { setShiftOpen(false); focusBarcode(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Left: barcode + cart ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barcode bar */}
        <div className="px-4 py-2.5 bg-white border-b border-black/[0.06] flex items-center gap-3">
          <div className="relative flex-1">
            <Barcode size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              ref={barcodeInputRef}
              data-barcode="true"
              type="text" value={query}
              onChange={e => handleQuery(e.target.value)}
              onKeyDown={handleBarcodeKey}
              onBlur={() => setTimeout(() => {
                if (anyModalOpen.current) return;
                const ae = document.activeElement;
                // If another keyboard-input element has focus, respect it — don't steal
                if (ae && ae !== barcodeInputRef.current && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) return;
                focusBarcode();
              }, 100)}
              placeholder="Scan barcode ou pesquisar por nome..."
              className="w-full pl-8 pr-3 py-2 bg-surface border border-black/[0.08] rounded-lg text-sm font-medium placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              autoComplete="off" spellCheck={false}
            />
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/[0.08] rounded-lg shadow-lg z-50 overflow-hidden"
                >
                  {suggestions.map(p => (
                    <button key={p.id} onMouseDown={e => { e.preventDefault(); addToCart(p); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors text-left">
                      <div>
                        <span className="text-sm font-semibold text-ink">{p.name}</span>
                        <span className="ml-2 text-[10px] font-mono text-muted num">{p.barcode}</span>
                        {p.requiresPrescription && (
                          <span className="ml-2 text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded font-black uppercase">Rx</span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-sm font-black text-accent num">{p.price.toFixed(2)} MT</div>
                        <div className={cn('text-[10px] font-bold num', p.stock <= p.minStock ? 'text-danger' : 'text-muted')}>
                          Stock: {p.stock} {p.unit}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Cart table */}
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 select-none">
              <div className="w-16 h-16 rounded-2xl bg-accent/8 flex items-center justify-center mb-5">
                <Barcode size={32} weight="bold" className="text-accent" />
              </div>
              <p className="text-[16px] font-black text-ink mb-1.5">Pronto para vender</p>
              <p className="text-[13px] text-muted font-medium max-w-[300px] leading-relaxed">
                Escaneie o código de barras ou escreva o nome do produto na barra acima.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface border-b border-black/[0.06]">
                  <th className="py-2 px-3 text-center text-[10px] font-black text-muted uppercase tracking-wider w-8">#</th>
                  <th className="py-2 px-3 text-[10px] font-black text-muted uppercase tracking-wider">Produto</th>
                  <th className="py-2 px-3 text-center text-[10px] font-black text-muted uppercase tracking-wider w-14">Un.</th>
                  <th className="py-2 px-3 text-right text-[10px] font-black text-muted uppercase tracking-wider w-24">Preço</th>
                  <th className="py-2 px-3 text-center text-[10px] font-black text-muted uppercase tracking-wider w-32">Qtd.</th>
                  <th className="py-2 px-3 text-right text-[10px] font-black text-muted uppercase tracking-wider w-28">Subtotal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {cart.map((item, i) => (
                  <CartRow
                    key={item.productId}
                    item={item} index={i}
                    flash={flashId === item.productId}
                    onQtyChange={updateQty}
                    onRemove={removeItem}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom status bar — active sale on the left, shift menu on the right */}
        <div className="px-4 py-2 bg-surface border-t border-black/[0.06] flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3 min-w-0">
            <span className="num shrink-0">{cart.length} {cart.length === 1 ? 'artigo' : 'artigos'}</span>
            {cart.length > 0 && (
              <button onClick={clearCart}
                className="flex items-center gap-1.5 hover:text-danger transition-colors font-semibold">
                <ArrowCounterClockwise size={12} weight="bold" />
                Cancelar
                <kbd className="ml-0.5 text-[9px] font-mono opacity-60">F1</kbd>
              </button>
            )}
          </div>

          <div className="relative" ref={shiftMenuRef}>
            <button
              onClick={() => setShiftMenuOpen(o => !o)}
              aria-expanded={shiftMenuOpen}
              className={cn(
                'flex items-center gap-1.5 px-2.5 h-7 rounded-md font-semibold transition-colors',
                shiftMenuOpen ? 'bg-black/[0.06] text-ink' : 'hover:text-ink hover:bg-black/[0.04]',
              )}
            >
              Fim de turno
              {sales.length > 0 && (
                <span className="px-1 py-px bg-black/[0.06] rounded text-[9px] font-black num">{sales.length}</span>
              )}
              <CaretDown size={10} weight="bold" className={cn('transition-transform', shiftMenuOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {shiftMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute bottom-full right-0 mb-1.5 min-w-[180px] bg-canvas border border-black/[0.08] rounded-lg shadow-lg overflow-hidden z-50"
                >
                  <button
                    onClick={() => { setShiftMenuOpen(false); setShiftOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 h-11 text-[12px] font-semibold text-ink hover:bg-surface transition-colors"
                  >
                    <ChartLineUp size={14} weight="bold" className="text-muted" />
                    Resumo do turno
                  </button>
                  {onOpenReturns && (
                    <button
                      onClick={() => { setShiftMenuOpen(false); onOpenReturns(); }}
                      className="w-full flex items-center gap-2.5 px-3 h-11 text-[12px] font-semibold text-ink hover:bg-surface transition-colors border-t border-black/[0.04]"
                    >
                      <ArrowCounterClockwise size={14} weight="bold" className="text-muted" />
                      Devoluções
                    </button>
                  )}
                  {onOpenReconciliation && (
                    <button
                      onClick={() => { setShiftMenuOpen(false); onOpenReconciliation(); }}
                      className="w-full flex items-center gap-2.5 px-3 h-11 text-[12px] font-semibold text-ink hover:bg-surface transition-colors border-t border-black/[0.04]"
                    >
                      <CurrencyCircleDollar size={14} weight="bold" className="text-muted" />
                      Fecho de caixa
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Right: totals + payment ── */}
      <div className="relative w-[280px] lg:w-[320px] xl:w-[360px] 2xl:w-[400px] flex flex-col bg-canvas border-l border-black/[0.06] shrink-0">
        {/* Sale number — subtle corner badge, no longer dominant chrome */}
        <span className="absolute top-3 right-4 font-mono text-[10px] text-muted/50 num select-none">#{saleNo}</span>

        {/* Total — owns the panel. Two states: empty (waiting) and active (number). */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 text-center select-none">
            <span className="text-[10px] font-black text-muted/60 uppercase tracking-[0.16em] mb-3">Sem artigos</span>
            <span className="text-[15px] font-bold text-muted/80 leading-snug">
              Aguardando<br />primeiro item
            </span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-4">
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.16em] mb-2">Total a Pagar</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[48px] lg:text-[56px] xl:text-[64px] 2xl:text-[72px] font-black tabular-nums leading-none text-ink">
                {total.toFixed(2)}
              </span>
              <span className="text-[20px] xl:text-[24px] font-bold leading-none mb-0.5 text-muted">MT</span>
            </div>

            <div className="mt-4 w-full border-t border-black/[0.05] pt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted">Artigos no carrinho</span>
                <span className="font-semibold text-ink num">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Low stock warning */}
        {cart.some(i => { const p = products.find(p => p.id === i.productId); return p && p.stock <= p.minStock; }) && (
          <div className="mx-4 mb-2 flex items-center gap-2 bg-warning/8 border border-warning/25 rounded-lg px-3 py-2">
            <Warning size={13} weight="fill" className="text-warning shrink-0" />
            <span className="text-[11px] font-semibold text-warning">Stock baixo em produto(s)</span>
          </div>
        )}

        <div className="px-4 pb-4 space-y-2">
          {/* Mobile money — M-Pesa (red) + Emola (orange), side-by-side primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={cart.length === 0}
              onClick={() => setMpesaOpen(true)}
              className="py-4 rounded-xl bg-mpesa text-white font-black text-[15px] uppercase tracking-wider hover:bg-mpesa/90 transition-colors shadow-md shadow-mpesa/25 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              M-Pesa
            </button>
            <button
              disabled={cart.length === 0}
              onClick={() => setEmolaOpen(true)}
              className="py-4 rounded-xl bg-emola text-white font-black text-[15px] uppercase tracking-wider hover:bg-emola/90 transition-colors shadow-md shadow-emola/25 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              Emola
            </button>
          </div>

          {/* Cash — secondary, outlined */}
          <button
            disabled={cart.length === 0}
            onClick={() => setCashOpen(true)}
            className="w-full py-2.5 rounded-xl border border-black/[0.08] font-bold text-[12px] uppercase tracking-wider text-muted hover:bg-black/[0.04] hover:text-ink transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <CurrencyCircleDollar size={14} weight="bold" />
            Dinheiro
          </button>
        </div>
      </div>
    </div>
  );
}
