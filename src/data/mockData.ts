import type { Product } from '../types';

// ─── Product catalog metadata (categories/units used by Inventory + POS) ──────
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

export function buildBarcodeMap(products: Product[]): Map<string, Product> {
  const m = new Map<string, Product>();
  for (const p of products) m.set(p.barcode, p);
  return m;
}
