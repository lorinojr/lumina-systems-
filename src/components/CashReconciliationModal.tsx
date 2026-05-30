"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Scales, CheckCircle, Warning } from '@phosphor-icons/react';
import type { Sale, CashReconciliation } from '../types';

function fmtMt(n: number) { return n.toFixed(2) + ' MT'; }

interface Props {
  sales:         Sale[];
  onSave:        (rec: CashReconciliation) => Promise<boolean>;
  onNotify:      (msg: string) => void;
  onClose:       () => void;
  cashierName?:  string;
  shiftStartMs:  number;
}

export function CashReconciliationModal({ sales, onSave, onNotify, onClose, cashierName, shiftStartMs }: Props) {
  const [declared, setDeclared] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  const todayCashSales = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return sales.filter(s => s.paymentMethod === 'cash' && s.timestamp >= start);
  }, [sales]);

  const expectedCash = useMemo(() => todayCashSales.reduce((s, x) => s + x.total, 0), [todayCashSales]);
  const declaredNum = parseFloat(declared) || 0;
  const difference = declaredNum - expectedCash;

  const handleSave = async () => {
    const rec: CashReconciliation = {
      id: crypto.randomUUID(),
      expectedCash, declaredCash: declaredNum, difference,
      notes: notes || undefined, cashierName,
      shiftStart: shiftStartMs, shiftEnd: Date.now(),
    };
    const ok = await onSave(rec);
    if (ok) {
      setDone(true);
      onNotify('Fecho de caixa registado.');
    } else {
      onNotify('Erro ao guardar fecho de caixa.');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
        className="relative w-full max-w-sm bg-white rounded-xl shadow-xl border border-black/[0.07] overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60">
          <div className="flex items-center gap-2">
            <Scales size={15} weight="bold" className="text-accent" />
            <span className="font-black text-[13px] uppercase tracking-wider">Fecho de Caixa</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
            <X size={14} weight="bold" />
          </button>
        </div>

        {!done ? (
          <div className="p-5 space-y-4">
            {/* Expected */}
            <div className="bg-surface rounded-xl p-4 text-center">
              <div className="text-[10px] font-black text-muted uppercase tracking-wider mb-1">Esperado (Dinheiro)</div>
              <div className="text-[28px] font-black text-ink tabular-nums">{fmtMt(expectedCash)}</div>
              <div className="text-[11px] text-muted mt-1">{todayCashSales.length} venda{todayCashSales.length !== 1 ? 's' : ''} em dinheiro hoje</div>
            </div>

            {/* Declared */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] block mb-1.5">Valor na Caixa (MT)</label>
              <input autoFocus type="number" min={0} step={0.01} value={declared}
                onChange={e => setDeclared(e.target.value)}
                placeholder={expectedCash.toFixed(2)}
                className="w-full px-4 py-3 bg-surface border-2 border-accent/30 focus:border-accent rounded-lg text-xl font-black text-accent focus:outline-none transition-colors text-center" />
            </div>

            {/* Difference */}
            {declared && (
              <div className={`rounded-xl p-3 text-center border ${
                Math.abs(difference) < 0.01 ? 'bg-success/8 border-success/20' :
                difference < 0 ? 'bg-danger/8 border-danger/20' : 'bg-warning/8 border-warning/20'}`}>
                <div className="text-[10px] font-black uppercase tracking-wider mb-0.5"
                  style={{ color: Math.abs(difference) < 0.01 ? 'var(--success)' : difference < 0 ? 'var(--danger)' : 'var(--warning)' }}>
                  {Math.abs(difference) < 0.01 ? 'Exacto' : difference > 0 ? 'Excedente' : 'Défice'}
                </div>
                <div className="text-[20px] font-black tabular-nums" style={{ color: Math.abs(difference) < 0.01 ? 'var(--success)' : difference < 0 ? 'var(--danger)' : 'var(--warning)' }}>
                  {difference >= 0 ? '+' : ''}{fmtMt(difference)}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.1em] block mb-1.5">Observações (opcional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex: Troco de abertura 500 MT"
                className="w-full px-3 py-2 bg-surface border border-black/[0.08] rounded-lg text-[13px] font-medium focus:outline-none focus:border-accent" />
            </div>

            <button onClick={handleSave} disabled={!declared}
              className="w-full py-3 rounded-xl bg-accent text-white font-bold text-[13px] hover:bg-accent/90 transition-colors shadow-md shadow-accent/20 disabled:opacity-30 disabled:shadow-none">
              Registar Fecho
            </button>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
            <CheckCircle size={40} weight="fill" className="text-success mx-auto" />
            <p className="text-[14px] font-black text-ink">Fecho Registado</p>
            <p className="text-[12px] text-muted">
              Esperado: {fmtMt(expectedCash)} · Declarado: {fmtMt(declaredNum)}
            </p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-ink text-white text-[12px] font-bold hover:bg-ink/80 transition-colors">Fechar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
