"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MagnifyingGlass, Plus, X, Barcode, Warning,
  CheckCircle, Package, ArrowDown, Pencil, CaretDown, CaretUp,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product } from '../types';
import { buildBarcodeMap, PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../data/mockData';
import { playBeep } from '../hooks/useBarcodeScanner';

const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(a));

// ─── Modal shell ─────────────────────────────────────────────────────────────
function ModalShell({
  onClose, children, maxW = 'max-w-xl',
}: { onClose: () => void; children: React.ReactNode; maxW?: string }) {
  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={`relative w-full ${maxW} bg-white rounded-xl shadow-xl border border-black/[0.07] overflow-hidden flex flex-col max-h-[92vh]`}
      >
        {children}
      </motion.div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-surface/60 shrink-0">
      <span className="font-black text-[13px] uppercase tracking-wider">{title}</span>
      <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}

// ─── Product form ─────────────────────────────────────────────────────────────
function ProductModal({
  product, prefillBarcode, onSave, onClose,
}: {
  product?: Product; prefillBarcode?: string;
  onSave: (p: Product) => void; onClose: () => void;
}) {
  const [f, setF] = useState({
    barcode:   product?.barcode   ?? prefillBarcode ?? '',
    name:      product?.name      ?? '',
    price:     product?.price?.toString()     ?? '',
    costPrice: product?.costPrice?.toString() ?? '',
    stock:     product?.stock?.toString()     ?? '0',
    minStock:  product?.minStock?.toString()  ?? '5',
    category:  product?.category  ?? 'Outros',
    unit:      product?.unit      ?? 'Un',
    taxExempt: product?.taxExempt ?? false,
    requiresPrescription: product?.requiresPrescription ?? false,
  });
  const s = (k: keyof typeof f, v: string | boolean) => setF(x => ({ ...x, [k]: v }));

  const save = () => {
    if (!f.barcode || !f.name || !f.price) return;
    onSave({
      id: product?.id ?? crypto.randomUUID(),
      barcode: f.barcode, name: f.name,
      price: parseFloat(f.price) || 0,
      costPrice: parseFloat(f.costPrice) || 0,
      stock: parseInt(f.stock) || 0,
      minStock: parseInt(f.minStock) || 5,
      category: f.category, unit: f.unit,
      taxExempt: f.taxExempt,
      requiresPrescription: f.requiresPrescription,
    });
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title={product ? 'Editar Produto' : 'Novo Produto'} onClose={onClose} />
      <div className="p-5 grid grid-cols-2 gap-3 overflow-auto">
        <div>
          <label className="field-label">Código de Barras *</label>
          <input autoFocus className="field-input font-mono"
            value={f.barcode} onChange={e => s('barcode', e.target.value)} placeholder="EAN-13 ou interno" />
        </div>
        <div>
          <label className="field-label">Unidade</label>
          <select className="field-input" value={f.unit} onChange={e => s('unit', e.target.value)}>
            {PRODUCT_UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="field-label">Nome do Produto *</label>
          <input className="field-input" value={f.name} onChange={e => s('name', e.target.value)}
            placeholder="ex. Paracetamol 500mg (20 Comp)" />
        </div>
        <div>
          <label className="field-label">Preço Venda (MT) *</label>
          <input type="number" className="field-input" value={f.price}
            onChange={e => s('price', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Preço Custo (MT)</label>
          <input type="number" className="field-input" value={f.costPrice}
            onChange={e => s('costPrice', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="field-label">Stock Actual</label>
          <input type="number" className="field-input" value={f.stock}
            onChange={e => s('stock', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="field-label">Stock Mínimo (alerta)</label>
          <input type="number" className="field-input" value={f.minStock}
            onChange={e => s('minStock', e.target.value)} placeholder="5" />
        </div>
        <div>
          <label className="field-label">Categoria</label>
          <select className="field-input" value={f.category} onChange={e => s('category', e.target.value)}>
            {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2.5">
          {[
            { key: 'requiresPrescription' as const, label: 'Receita Médica', color: 'bg-danger' },
            { key: 'taxExempt'            as const, label: 'Isento de IVA',  color: 'bg-success' },
          ].map(t => (
            <label key={t.key} className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => s(t.key, !f[t.key])}
                className={cn('w-10 h-5 rounded-full relative transition-colors', f[t.key] ? t.color : 'bg-black/10')}
              >
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all', f[t.key] ? 'right-0.5' : 'left-0.5')} />
              </button>
              <span className="text-[12px] font-semibold text-ink">{t.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-2 shrink-0">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-black/[0.08] font-bold text-sm hover:bg-surface transition-colors">
          Cancelar
        </button>
        <button disabled={!f.barcode || !f.name || !f.price} onClick={save}
          className="flex-[2] py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-colors shadow-md shadow-accent/20 disabled:opacity-30 disabled:shadow-none">
          {product ? 'Guardar Alterações' : 'Criar Produto'}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Receive stock modal ──────────────────────────────────────────────────────
function ReceiveModal({
  products, onUpdateStock, onNotify, onClose,
}: {
  products: Product[];
  onUpdateStock: (id: string, delta: number) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<{ product: Product; qty: number }[]>([]);
  const [query,   setQuery]   = useState('');
  const [lastOk,  setLastOk]  = useState('');
  const barcodeMap = useMemo(() => buildBarcodeMap(products), [products]);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const scan = useCallback((val: string) => {
    const p = barcodeMap.get(val.trim());
    if (!p) { onNotify('Não encontrado: ' + val); playBeep('error'); return; }
    setEntries(prev => {
      const ex = prev.find(e => e.product.id === p.id);
      return ex
        ? prev.map(e => e.product.id === p.id ? { ...e, qty: e.qty + 1 } : e)
        : [...prev, { product: p, qty: 1 }];
    });
    setLastOk(p.name);
    playBeep('ok');
    setQuery('');
  }, [barcodeMap, onNotify]);

  const confirm = () => {
    entries.forEach(e => onUpdateStock(e.product.id, e.qty));
    onNotify(`Entrada confirmada: ${entries.reduce((s, e) => s + e.qty, 0)} unidades.`);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} maxW="max-w-2xl">
      <ModalHeader title="Receber Stock" onClose={onClose} />
      <div className="px-5 pt-4 shrink-0">
        <div className="relative">
          <Barcode size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef} data-barcode="true"
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); scan(query); } if (e.key === 'Escape') onClose(); }}
            placeholder="Escanear código de barras..."
            className="w-full pl-8 pr-3 py-2.5 bg-surface border-2 border-accent/30 focus:border-accent rounded-lg text-sm font-medium focus:outline-none transition-colors"
            autoComplete="off"
          />
        </div>
        {lastOk && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-success font-semibold">
            <CheckCircle size={12} weight="fill" />
            {lastOk} adicionado
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto px-5 py-3">
        {entries.length === 0 ? (
          <div className="text-center text-muted py-10">
            <Barcode size={36} weight="thin" className="mx-auto mb-2 opacity-25" />
            <p className="text-sm font-medium opacity-40">Sem artigos ainda — escaneie para começar</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface border-b border-black/[0.06]">
                <th className="py-2 px-3 text-[10px] font-black text-muted uppercase tracking-wider">Produto</th>
                <th className="py-2 px-3 text-right text-[10px] font-black text-muted uppercase tracking-wider w-28">Qtd. Recebida</th>
                <th className="py-2 px-3 text-right text-[10px] font-black text-muted uppercase tracking-wider w-32">Actual → Novo</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {entries.map(e => (
                <tr key={e.product.id} className="hover:bg-surface/60">
                  <td className="py-2 px-3">
                    <div className="font-semibold text-[13px]">{e.product.name}</div>
                    <div className="font-mono text-[10px] text-muted">{e.product.barcode}</div>
                  </td>
                  <td className="py-2 px-3">
                    <input type="number" min={1} value={e.qty}
                      onChange={ev => { const v = parseInt(ev.target.value); if (!isNaN(v) && v >= 0) setEntries(p => p.map(x => x.product.id === e.product.id ? { ...x, qty: v } : x)); }}
                      className="w-20 text-center font-black text-sm border border-black/[0.08] rounded focus:outline-none focus:border-accent px-2 py-1 ml-auto block" />
                  </td>
                  <td className="py-2 px-3 text-right text-[13px] font-semibold text-muted">
                    {e.product.stock} → <span className="text-success font-black">{e.product.stock + e.qty}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => setEntries(p => p.filter(x => x.product.id !== e.product.id))}
                      className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors">
                      <X size={12} weight="bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="px-5 py-4 border-t border-black/[0.06] flex gap-2 shrink-0">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-black/[0.08] font-bold text-sm hover:bg-surface transition-colors">
          Cancelar
        </button>
        <button disabled={entries.length === 0} onClick={confirm}
          className="flex-[2] py-2.5 rounded-lg bg-success text-white font-bold text-sm hover:bg-success/90 transition-colors shadow-md shadow-success/20 disabled:opacity-30 disabled:shadow-none">
          Confirmar Entrada · {entries.reduce((s, e) => s + e.qty, 0)} un.
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface InventoryModuleProps {
  products:      Product[];
  onSaveProduct: (p: Product) => void;
  onUpdateStock: (id: string, delta: number) => void;
  onNotify:      (msg: string) => void;
  onBulkImport?: () => void;
}

type SortKey = 'name' | 'stock' | 'price' | 'category';

export function InventoryModule({ products, onSaveProduct, onUpdateStock, onNotify, onBulkImport }: InventoryModuleProps) {
  const [search,      setSearch]      = useState('');
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const [newOpen,     setNewOpen]     = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sortKey,     setSortKey]     = useState<SortKey>('name');
  const [sortAsc,     setSortAsc]     = useState(true);
  const [filterCat,   setFilterCat]   = useState('');

  const categories = useMemo(() =>
    Array.from(new Set(products.map(p => p.category))).sort(),
  [products]);

  const lowStockProducts = useMemo(() =>
    products.filter(p => p.stock <= p.minStock),
  [products]);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      if (filterCat && p.category !== filterCat) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.category.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      let d = 0;
      if (sortKey === 'name')     d = a.name.localeCompare(b.name);
      if (sortKey === 'stock')    d = a.stock - b.stock;
      if (sortKey === 'price')    d = a.price - b.price;
      if (sortKey === 'category') d = a.category.localeCompare(b.category);
      return sortAsc ? d : -d;
    });
  }, [products, search, filterCat, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(a => !a); else { setSortKey(k); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc
        ? <CaretUp   size={10} weight="bold" className="text-accent" />
        : <CaretDown size={10} weight="bold" className="text-accent" />
      : <CaretDown size={10} weight="bold" className="text-black/20" />;

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-canvas">
      {/* Modals */}
      <AnimatePresence>
        {(newOpen || editProduct) && (
          <ProductModal
            product={editProduct}
            onSave={p => { onSaveProduct(p); setEditProduct(undefined); setNewOpen(false); onNotify(`"${p.name}" guardado.`); }}
            onClose={() => { setEditProduct(undefined); setNewOpen(false); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {receiveOpen && (
          <ReceiveModal
            products={products}
            onUpdateStock={onUpdateStock}
            onNotify={onNotify}
            onClose={() => setReceiveOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-5 py-3 bg-white border-b border-black/[0.06] flex items-center justify-between">
        <h2 className="text-sm font-black tracking-tight text-ink">
          Inventário
          <span className="ml-2 text-[11px] font-semibold text-muted normal-case">{filtered.length} produtos</span>
        </h2>
        <div className="flex items-center gap-2">
          {onBulkImport && (
            <button onClick={onBulkImport}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black/[0.08] rounded-lg text-xs font-bold hover:bg-surface transition-colors">
              <Plus size={13} weight="bold" className="text-accent" />
              Importar CSV
            </button>
          )}
          <button onClick={() => setReceiveOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-black/[0.08] rounded-lg text-xs font-bold hover:bg-surface transition-colors">
            <ArrowDown size={13} weight="bold" className="text-success" />
            Receber Stock
          </button>
          <button onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20">
            <Plus size={13} weight="bold" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Low-stock banner */}
      <AnimatePresence>
        {lowStockProducts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 py-2 bg-warning/[0.07] border-b border-warning/20 flex items-center gap-2.5">
              <Warning size={13} weight="fill" className="text-warning shrink-0" />
              <span className="text-[12px] font-semibold text-warning shrink-0">
                {lowStockProducts.length === 1 ? '1 produto com stock baixo' : `${lowStockProducts.length} produtos com stock baixo`}
              </span>
              <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                {lowStockProducts.slice(0, 3).map(p => (
                  <span key={p.id} className="shrink-0 text-[10px] font-bold bg-warning/15 text-warning/90 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name}
                    <span className="ml-1 opacity-70">({p.stock})</span>
                  </span>
                ))}
                {lowStockProducts.length > 3 && (
                  <span className="text-[10px] font-bold text-warning/70 shrink-0">
                    +{lowStockProducts.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + filter */}
      <div className="px-5 py-2 bg-white border-b border-black/[0.06] flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, código ou categoria..."
            className="w-full pl-8 pr-3 py-1.5 bg-surface border border-black/[0.07] rounded-lg text-sm font-medium focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <select
          value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-1.5 bg-surface border border-black/[0.07] rounded-lg text-xs font-semibold focus:outline-none focus:border-accent transition-colors"
        >
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted select-none">
            <Package size={40} weight="thin" className="mb-3 opacity-25" />
            <p className="text-sm font-semibold opacity-40">
              {products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface border-b border-black/[0.06]">
                <th className="py-2 px-3 text-[10px] font-black text-muted uppercase tracking-wider w-36">Código</th>
                <th className="py-2 px-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1 text-[10px] font-black text-muted uppercase tracking-wider">
                    Produto <SortIcon k="name" />
                  </div>
                </th>
                <th className="py-2 px-3 cursor-pointer select-none" onClick={() => toggleSort('category')}>
                  <div className="flex items-center gap-1 text-[10px] font-black text-muted uppercase tracking-wider">
                    Categoria <SortIcon k="category" />
                  </div>
                </th>
                <th className="py-2 px-3 text-center text-[10px] font-black text-muted uppercase tracking-wider w-14">Un.</th>
                <th className="py-2 px-3 text-right cursor-pointer select-none w-24" onClick={() => toggleSort('price')}>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-black text-muted uppercase tracking-wider">
                    Preço <SortIcon k="price" />
                  </div>
                </th>
                <th className="py-2 px-3 text-right text-[10px] font-black text-muted uppercase tracking-wider w-24">Custo</th>
                <th className="py-2 px-3 text-center cursor-pointer select-none w-28" onClick={() => toggleSort('stock')}>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black text-muted uppercase tracking-wider">
                    Stock <SortIcon k="stock" />
                  </div>
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.map(p => {
                const isLow = p.stock <= p.minStock;
                return (
                  <tr key={p.id} className="group hover:bg-surface/60 transition-colors">
                    <td className="py-1.5 px-3 font-mono text-[11px] text-muted">{p.barcode}</td>
                    <td className="py-1.5 px-3">
                      <div className="font-semibold text-[13px] text-ink leading-tight">{p.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {p.requiresPrescription && <span className="text-[9px] bg-danger/10 text-danger px-1 py-0.5 rounded font-black">Rx</span>}
                        {p.taxExempt && <span className="text-[9px] bg-success/10 text-success px-1 py-0.5 rounded font-black">0%</span>}
                      </div>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-[11px] font-semibold bg-surface px-2 py-0.5 rounded text-muted">{p.category}</span>
                    </td>
                    <td className="py-1.5 px-3 text-center text-[12px] font-mono text-muted">{p.unit}</td>
                    <td className="py-1.5 px-3 text-right text-[13px] font-black text-ink">{p.price.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right text-[13px] font-semibold text-muted">{p.costPrice.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-center">
                      <span className={cn('text-[13px] font-black', isLow ? 'text-danger' : 'text-ink')}>
                        {p.stock}
                      </span>
                      {isLow && <Warning size={11} weight="fill" className="inline ml-1 text-danger" />}
                      <div className="text-[9px] text-muted/60">min {p.minStock}</div>
                    </td>
                    <td className="py-1.5 px-3">
                      <button onClick={() => setEditProduct(p)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted hover:bg-accent/10 hover:text-accent transition-colors opacity-0 group-hover:opacity-100">
                        <Pencil size={12} weight="bold" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
