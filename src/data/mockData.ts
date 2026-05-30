import type { Product } from '../types';

// ─── Shared constants ─────────────────────────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  'Analgésicos',
  'Antibióticos',
  'Antialérgicos',
  'Gastrointestinal',
  'Vitaminas',
  'Soluções IV',
  'Primeiros Socorros',
  'EPI',
  'Higiene',
  'Padaria',
  'Mercearia',
  'Bebidas',
  'Tabaco',
  'Outros',
] as const;

export const PRODUCT_UNITS = ['Un', 'Cx', 'Fr', 'Tb', 'Kg', 'Lt', 'Dose', 'Par', 'M'] as const;

// ─── Products start empty — add real products via the Inventory page ──────────
export const MOCK_PRODUCTS: Product[] = [];

export function buildBarcodeMap(products: Product[]): Map<string, Product> {
  const m = new Map<string, Product>();
  for (const p of products) m.set(p.barcode, p);
  return m;
}
