"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, UploadSimple, CheckCircle, Warning, Spinner, FileText } from '@phosphor-icons/react';
import type { Product } from '../types';

interface Props {
  onImport: (products: Product[]) => Promise<number>;
  onNotify: (msg: string) => void;
  onClose:  () => void;
}

interface ParsedRow {
  barcode: string; name: string; price: number; costPrice: number;
  stock: number; minStock: number; category: string; unit: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/^"|"$/g, ''));
  const colMap: Record<string, number> = {};
  const aliases: Record<string, string[]> = {
    barcode:   ['barcode', 'codigo', 'código', 'ean', 'code'],
    name:      ['name', 'nome', 'produto', 'product', 'descricao', 'descrição'],
    price:     ['price', 'preco', 'preço', 'preco_venda', 'sell_price'],
    costPrice: ['cost', 'custo', 'cost_price', 'preco_custo'],
    stock:     ['stock', 'qty', 'quantidade', 'quantity'],
    minStock:  ['min_stock', 'stock_minimo', 'min'],
    category:  ['category', 'categoria', 'cat'],
    unit:      ['unit', 'unidade', 'un'],
  };

  for (const [field, names] of Object.entries(aliases)) {
    const idx = header.findIndex(h => names.some(n => h.includes(n)));
    if (idx >= 0) colMap[field] = idx;
  }

  if (!colMap.barcode && !colMap.name) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
    const get = (f: string, def = '') => (colMap[f] !== undefined ? cols[colMap[f]] ?? def : def);

    const barcode = get('barcode');
    const name = get('name');
    if (!name) continue;

    rows.push({
      barcode: barcode || `IMP-${String(i).padStart(4, '0')}`,
      name,
      price: parseFloat(get('price', '0')) || 0,
      costPrice: parseFloat(get('costPrice', '0')) || 0,
      stock: parseInt(get('stock', '0')) || 0,
      minStock: parseInt(get('minStock', '5')) || 5,
      category: get('category', 'Outros') || 'Outros',
      unit: get('unit', 'Un') || 'Un',
    });
  }
  return rows;
}

export function BulkImportModal({ onImport, onNotify, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [imported, setImported] = useState(0);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        onNotify('Ficheiro vazio ou formato inválido.');
        return;
      }
      setParsed(rows);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const doImport = async () => {
    setStep('importing');
    const products: Product[] = parsed.map(r => ({
      id: crypto.randomUUID(),
      barcode: r.barcode, name: r.name, price: r.price,
      costPrice: r.costPrice, stock: r.stock, minStock: r.minStock,
      category: r.category, unit: r.unit,
    }));
    const count = await onImport(products);
    setImported(count);
    setStep('done');
    onNotify(`${count} produto(s) importado(s).`);
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-black/[0.07] overflow-hidden flex flex-col max-h-[85vh]">

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60 shrink-0">
          <div className="flex items-center gap-2">
            <UploadSimple size={15} weight="bold" className="text-accent" />
            <span className="font-black text-[13px] uppercase tracking-wider">Importar Produtos (CSV)</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
            <X size={14} weight="bold" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-5 space-y-4">
            <div
              onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-black/15 rounded-xl p-10 text-center cursor-pointer hover:border-accent/40 hover:bg-accent/[0.02] transition-colors">
              <FileText size={36} weight="thin" className="mx-auto mb-3 text-muted opacity-40" />
              <p className="text-[13px] font-semibold text-ink">Arraste um ficheiro CSV ou clique para seleccionar</p>
              <p className="text-[11px] text-muted mt-1">Colunas: barcode, nome, preço, custo, stock, categoria, unidade</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {step === 'preview' && (
          <>
            <div className="px-5 py-3 border-b border-black/[0.04] bg-surface/40 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-muted">{fileName} — {parsed.length} produto(s)</span>
              <button onClick={() => { setStep('upload'); setParsed([]); }} className="text-[11px] font-bold text-accent hover:underline">Alterar ficheiro</button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface">
                    <th className="py-2 px-3 text-[10px] font-black text-muted uppercase tracking-wider">Código</th>
                    <th className="py-2 px-3 text-[10px] font-black text-muted uppercase tracking-wider">Nome</th>
                    <th className="py-2 px-3 text-right text-[10px] font-black text-muted uppercase tracking-wider">Preço</th>
                    <th className="py-2 px-3 text-center text-[10px] font-black text-muted uppercase tracking-wider">Stock</th>
                    <th className="py-2 px-3 text-[10px] font-black text-muted uppercase tracking-wider">Cat.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {parsed.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-surface/50">
                      <td className="py-1.5 px-3 font-mono text-[11px] text-muted">{r.barcode}</td>
                      <td className="py-1.5 px-3 text-[12px] font-semibold text-ink">{r.name}</td>
                      <td className="py-1.5 px-3 text-right text-[12px] font-bold text-ink">{r.price.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-center text-[12px] font-bold text-ink">{r.stock}</td>
                      <td className="py-1.5 px-3 text-[11px] text-muted">{r.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && <p className="text-center text-[11px] text-muted py-2">+ {parsed.length - 50} mais...</p>}
            </div>
            <div className="px-5 py-4 border-t border-black/[0.06] flex gap-2 shrink-0">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-black/[0.08] font-bold text-sm hover:bg-surface transition-colors">Cancelar</button>
              <button onClick={doImport}
                className="flex-[2] py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-colors shadow-md shadow-accent/20">
                Importar {parsed.length} Produto(s)
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="p-8 text-center space-y-4">
            <Spinner size={32} className="text-accent animate-spin mx-auto" />
            <p className="text-[13px] text-muted font-semibold">A importar produtos...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="p-6 text-center space-y-4">
            <CheckCircle size={40} weight="fill" className="text-success mx-auto" />
            <p className="text-[15px] font-black text-ink">{imported} Produto(s) Importados</p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-ink text-white text-[12px] font-bold hover:bg-ink/80 transition-colors">Fechar</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
