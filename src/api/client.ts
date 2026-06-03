import { supabase } from '../lib/supabase';
import { enqueue } from '../lib/offlineQueue';
import type { Product, Sale, Return, CashReconciliation } from '../types';

let _storeId: string | null = null;
export function setStoreId(id: string | null) { _storeId = id; }

// ── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  if (!_storeId) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', _storeId)
    .order('name');

  if (error) throw new Error(`fetchProducts: ${error.message}`);
  return (data ?? []).map(toProduct);
}

export async function upsertProduct(p: Product): Promise<void> {
  if (!_storeId) return;
  const row = {
    id: p.id, barcode: p.barcode, name: p.name, price: p.price,
    cost_price: p.costPrice, stock: p.stock, min_stock: p.minStock,
    category: p.category, unit: p.unit,
    tax_exempt: p.taxExempt ?? false,
    requires_prescription: p.requiresPrescription ?? false,
    updated_at: new Date().toISOString(),
    store_id: _storeId,
  };
  const { error } = await supabase.from('products').upsert(row);
  if (error) throw new Error(`upsertProduct: ${error.message}`);
}

export function upsertProductOffline(p: Product): void {
  enqueue('upsert_product', { ...p, storeId: _storeId });
}

export async function syncStock(productId: string, stock: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (error) throw new Error(`syncStock: ${error.message}`);
}

export function syncStockOffline(productId: string, stock: number): void {
  enqueue('sync_stock', { productId, stock });
}

// ── Sales ────────────────────────────────────────────────────────────────────

export async function fetchSales(): Promise<Sale[]> {
  if (!_storeId) return [];
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('*')
    .eq('store_id', _storeId)
    .order('timestamp_ms', { ascending: false });

  if (salesErr) throw new Error(`fetchSales: ${salesErr.message}`);
  const saleIds = (sales ?? []).map(s => s.id);
  if (saleIds.length === 0) return [];

  const { data: items, error: itemsErr } = await supabase
    .from('sale_items')
    .select('*')
    .in('sale_id', saleIds);

  if (itemsErr) throw new Error(`fetchSales items: ${itemsErr.message}`);

  const itemsBySale = new Map<string, typeof items>();
  for (const item of items ?? []) {
    if (!itemsBySale.has(item.sale_id)) itemsBySale.set(item.sale_id, []);
    itemsBySale.get(item.sale_id)!.push(item);
  }

  return (sales ?? []).map(s => ({
    id: s.id, number: s.number,
    subtotal: Number(s.subtotal), tax: Number(s.tax), total: Number(s.total),
    paymentMethod: s.payment_method as 'cash' | 'mpesa' | 'emola',
    timestamp: new Date(Number(s.timestamp_ms)),
    cashierId: s.cashier_id ?? null, cashierName: s.cashier_name ?? null,
    items: (itemsBySale.get(s.id) ?? []).map(i => ({
      productId: i.product_id, barcode: i.barcode, name: i.name,
      price: Number(i.price), quantity: i.quantity,
      discount: Number(i.discount), subtotal: Number(i.subtotal), unit: i.unit,
    })),
  }));
}

export async function recordSale(sale: Sale): Promise<void> {
  const { error } = await supabase.rpc('record_sale', {
    p_sale: {
      id: sale.id, number: sale.number,
      subtotal: sale.subtotal, tax: sale.tax, total: sale.total,
      paymentMethod: sale.paymentMethod,
      cashierId: sale.cashierId ?? null, cashierName: sale.cashierName ?? null,
      timestampMs: sale.timestamp.getTime(),
      storeId: _storeId,
    },
    p_items: sale.items.map(i => ({
      productId: i.productId, barcode: i.barcode, name: i.name,
      price: i.price, quantity: i.quantity,
      discount: i.discount, subtotal: i.subtotal, unit: i.unit,
    })),
  });
  if (error) throw new Error(`recordSale: ${error.message}`);
}

export function recordSaleOffline(sale: Sale): void {
  enqueue('record_sale', {
    ...sale,
    timestamp: sale.timestamp.getTime(),
    storeId: _storeId,
  });
}

// ── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    return !error;
  } catch { return false; }
}

// ── Offline replay executor ──────────────────────────────────────────────────

export async function replayOperation(op: { type: string; payload: any }): Promise<boolean> {
  switch (op.type) {
    case 'upsert_product': {
      const p = op.payload;
      _storeId = p.storeId ?? _storeId;
      await upsertProduct(p);
      return true;
    }
    case 'sync_stock': {
      await syncStock(op.payload.productId, op.payload.stock);
      return true;
    }
    case 'record_sale': {
      const s = op.payload;
      _storeId = s.storeId ?? _storeId;
      const sale: Sale = {
        ...s,
        timestamp: new Date(s.timestamp),
      };
      await recordSale(sale);
      return true;
    }
    default: return false;
  }
}

// ── Sale number ──────────────────────────────────────────────────────────────

export async function nextSaleNumber(): Promise<number> {
  if (!_storeId) return 1;
  const { data, error } = await supabase.rpc('next_sale_number', { p_store_id: _storeId });
  if (error) throw new Error(`nextSaleNumber: ${error.message}`);
  return data as number;
}

// ── Returns ──────────────────────────────────────────────────────────────────

export async function processReturn(ret: Return): Promise<{ returnId: string; number: number } | null> {
  const { data, error } = await supabase.rpc('process_return', {
    p_return: {
      id: ret.id, storeId: _storeId, saleId: ret.saleId,
      total: ret.total, reason: ret.reason ?? null,
      cashierId: ret.cashierId ?? null, cashierName: ret.cashierName ?? null,
      timestampMs: ret.timestamp.getTime(),
    },
    p_items: ret.items.map(i => ({
      productId: i.productId, name: i.name, price: i.price,
      quantity: i.quantity, subtotal: i.subtotal,
    })),
  });
  if (error) { console.error('processReturn:', error); return null; }
  const d = data as any;
  if (!d?.success) return null;
  return { returnId: d.return_id as string, number: d.number as number };
}

export async function fetchReturns(): Promise<Return[]> {
  if (!_storeId) return [];
  const { data, error } = await supabase.from('returns').select('*')
    .eq('store_id', _storeId).order('timestamp_ms', { ascending: false });
  if (error) return [];
  const ids = (data ?? []).map(r => r.id);
  if (ids.length === 0) return [];
  const { data: items } = await supabase.from('return_items').select('*').in('return_id', ids);
  const itemsByReturn = new Map<string, any[]>();
  for (const i of items ?? []) {
    if (!itemsByReturn.has(i.return_id)) itemsByReturn.set(i.return_id, []);
    itemsByReturn.get(i.return_id)!.push(i);
  }
  return (data ?? []).map(r => ({
    id: r.id, saleId: r.sale_id, number: r.number,
    total: Number(r.total), reason: r.reason,
    cashierId: r.cashier_id, cashierName: r.cashier_name,
    timestamp: new Date(Number(r.timestamp_ms)),
    items: (itemsByReturn.get(r.id) ?? []).map((i: any) => ({
      productId: i.product_id, name: i.name, price: Number(i.price),
      quantity: i.quantity, subtotal: Number(i.subtotal),
    })),
  }));
}

// ── Cash Reconciliation ──────────────────────────────────────────────────────

export async function saveReconciliation(rec: CashReconciliation): Promise<boolean> {
  const { data, error } = await supabase.rpc('save_reconciliation', {
    p_data: {
      storeId: _storeId, cashierId: null, cashierName: rec.cashierName ?? null,
      expectedCash: rec.expectedCash, declaredCash: rec.declaredCash,
      difference: rec.difference, notes: rec.notes ?? null,
      shiftStart: rec.shiftStart, shiftEnd: rec.shiftEnd,
    },
  });
  if (error) { console.error('saveReconciliation:', error); return false; }
  return !!(data as any)?.success;
}

// ── Bulk product import ──────────────────────────────────────────────────────

export async function bulkUpsertProducts(products: Product[]): Promise<number> {
  if (!_storeId || products.length === 0) return 0;
  const rows = products.map(p => ({
    id: p.id, barcode: p.barcode, name: p.name, price: p.price,
    cost_price: p.costPrice, stock: p.stock, min_stock: p.minStock,
    category: p.category, unit: p.unit,
    tax_exempt: p.taxExempt ?? false,
    requires_prescription: p.requiresPrescription ?? false,
    updated_at: new Date().toISOString(),
    store_id: _storeId,
  }));
  const { error } = await supabase.from('products').upsert(rows);
  if (error) throw new Error(`bulkUpsertProducts: ${error.message}`);
  return rows.length;
}

// ── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeProducts(storeId: string, onUpdate: () => void) {
  return supabase
    .channel(`products-${storeId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'products',
      filter: `store_id=eq.${storeId}`,
    }, onUpdate)
    .subscribe();
}

export function subscribeSales(storeId: string, onUpdate: () => void) {
  return supabase
    .channel(`sales-${storeId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'sales',
      filter: `store_id=eq.${storeId}`,
    }, onUpdate)
    .subscribe();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toProduct(row: any): Product {
  return {
    id: row.id, barcode: row.barcode, name: row.name,
    price: Number(row.price), costPrice: Number(row.cost_price),
    stock: row.stock, minStock: row.min_stock,
    category: row.category, unit: row.unit,
    taxExempt: row.tax_exempt === true,
    requiresPrescription: row.requires_prescription === true,
  };
}
