"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, MagnifyingGlass, ArrowCounterClockwise, CheckCircle, Warning } from '@phosphor-icons/react';
import type { Sale, Return, ReturnItem } from '../types';

function fmtMt(n: number) { return n.toFixed(2) + ' MT'; }

interface Props {
  sales:        Sale[];
  onProcess:    (ret: Return) => Promise<{ returnId: string; number: number } | null>;
  onNotify:     (msg: string) => void;
  onClose:      () => void;
  currentUserId?:   string | null;
  currentUserName?: string | null;
}

export function ReturnsModal({ sales, onProcess, onNotify, onClose, currentUserId, currentUserName }: Props) {
  const [step, setStep] = useState<'search' | 'select' | 'confirm' | 'done'>('search');
  const [query, setQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<Map<string, number>>(new Map());
  const [reason, setReason] = useState('');
  const [returnNumber, setReturnNumber] = useState(0);

  const searchResults = useMemo(() => {
    if (!query.trim()) return sales.slice(0, 10);
    const q = query.trim().toLowerCase();
    return sales.filter(s =>
      String(s.number).includes(q) || s.items.some(i => i.name.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [sales, query]);

  const toggleItem = (productId: string, maxQty: number) => {
    setReturnItems(prev => {
      const next = new Map(prev);
      if (next.has(productId)) next.delete(productId);
      else next.set(productId, maxQty);
      return next;
    });
  };

  const setItemQty = (productId: string, qty: number) => {
    setReturnItems(prev => { const next = new Map(prev); next.set(productId, qty); return next; });
  };

  const returnTotal = useMemo(() => {
    if (!selectedSale) return 0;
    return selectedSale.items
      .filter(i => returnItems.has(i.productId))
      .reduce((s, i) => s + i.price * (returnItems.get(i.productId) ?? 0), 0);
  }, [selectedSale, returnItems]);

  const handleConfirm = async () => {
    if (!selectedSale) return;
    const items: ReturnItem[] = selectedSale.items
      .filter(i => returnItems.has(i.productId))
      .map(i => ({
        productId: i.productId, name: i.name, price: i.price,
        quantity: returnItems.get(i.productId) ?? 0,
        subtotal: i.price * (returnItems.get(i.productId) ?? 0),
      }));

    const ret: Return = {
      id: crypto.randomUUID(), saleId: selectedSale.id, number: 0,
      total: returnTotal, reason: reason || undefined, items,
      cashierId: currentUserId, cashierName: currentUserName,
      timestamp: new Date(),
    };

    const result = await onProcess(ret);
    if (result) {
      setReturnNumber(result.number);
      setStep('done');
      onNotify(`Devolução #${result.number} processada — ${fmtMt(returnTotal)} devolvido.`);
    } else {
      onNotify('Erro ao processar devolução.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-black/[0.07] overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowCounterClockwise size={15} weight="bold" className="text-warning" />
            <span className="font-black text-[13px] uppercase tracking-wider">Devolução</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Step: Search sale */}
        {step === 'search' && (
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <div className="relative mb-3">
                <MagnifyingGlass size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Pesquisar por número de venda..."
                  className="w-full pl-8 pr-3 py-2 bg-surface border border-black/[0.08] rounded-lg text-sm font-medium focus:outline-none focus:border-accent" />
              </div>
              <div className="space-y-1.5">
                {searchResults.map(s => (
                  <button key={s.id} onClick={() => { setSelectedSale(s); setStep('select'); setReturnItems(new Map()); }}
                    className="w-full flex items-center justify-between p-3 bg-surface/50 rounded-lg hover:bg-surface transition-colors text-left">
                    <div>
                      <span className="font-mono text-[12px] font-bold text-ink">#{String(s.number).padStart(4, '0')}</span>
                      <span className="ml-2 text-[11px] text-muted">{s.items.length} artigos</span>
                    </div>
                    <span className="text-[13px] font-black text-ink">{fmtMt(s.total)}</span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-center text-[12px] text-muted py-8">Nenhuma venda encontrada</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Select items to return */}
        {step === 'select' && selectedSale && (
          <div className="flex-1 overflow-auto">
            <div className="px-4 py-3 bg-surface/40 border-b border-black/[0.04]">
              <span className="text-[11px] font-bold text-muted">Venda #{String(selectedSale.number).padStart(4, '0')} — seleccione os artigos a devolver</span>
            </div>
            <div className="p-4 space-y-2">
              {selectedSale.items.map(item => {
                const selected = returnItems.has(item.productId);
                const qty = returnItems.get(item.productId) ?? item.quantity;
                return (
                  <div key={item.productId} className={`p-3 rounded-lg border transition-colors ${selected ? 'border-warning/40 bg-warning/5' : 'border-black/[0.06]'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selected} onChange={() => toggleItem(item.productId, item.quantity)}
                        className="w-4 h-4 rounded accent-warning" />
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-ink">{item.name}</div>
                        <div className="text-[11px] text-muted">{fmtMt(item.price)} × {item.quantity}</div>
                      </div>
                      {selected && (
                        <input type="number" min={1} max={item.quantity} value={qty}
                          onChange={e => setItemQty(item.productId, Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-16 text-center text-[13px] font-black border border-black/[0.08] rounded px-2 py-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 pb-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] block mb-1">Motivo (opcional)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="ex: Produto danificado"
                className="w-full px-3 py-2 bg-surface border border-black/[0.08] rounded-lg text-[13px] font-medium focus:outline-none focus:border-accent" />
            </div>
            <div className="px-4 py-4 border-t border-black/[0.06] flex items-center justify-between">
              <button onClick={() => setStep('search')} className="text-[12px] font-bold text-muted hover:text-ink transition-colors">Voltar</button>
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-black text-warning">{fmtMt(returnTotal)}</span>
                <button disabled={returnItems.size === 0} onClick={() => setStep('confirm')}
                  className="px-4 py-2 bg-warning text-white rounded-lg text-[12px] font-bold hover:bg-warning/90 transition-colors disabled:opacity-30">
                  Devolver
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="p-6 text-center space-y-4">
            <Warning size={36} weight="fill" className="text-warning mx-auto" />
            <p className="text-[14px] font-bold text-ink">Confirmar devolução de {fmtMt(returnTotal)}?</p>
            <p className="text-[12px] text-muted">O stock será reposto automaticamente.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('select')}
                className="flex-1 py-2.5 rounded-lg border border-black/[0.08] text-[12px] font-bold text-muted hover:bg-surface transition-colors">Cancelar</button>
              <button onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-lg bg-warning text-white text-[12px] font-bold hover:bg-warning/90 transition-colors">Confirmar</button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="p-6 text-center space-y-4">
            <CheckCircle size={40} weight="fill" className="text-success mx-auto" />
            <p className="text-[15px] font-black text-ink">Devolução #{returnNumber}</p>
            <p className="text-[12px] text-muted">Stock reposto. Valor: {fmtMt(returnTotal)}</p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-ink text-white text-[12px] font-bold hover:bg-ink/80 transition-colors">Fechar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
