export type Language = 'en' | 'pt';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  category: string;
  unit: string;
  taxExempt?: boolean;
  requiresPrescription?: boolean;
}

export interface CartItem {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
  unit: string;
}

export interface Sale {
  id: string;
  number: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa';
  timestamp: Date;
  cashierId?: string | null;
  cashierName?: string | null;
}

export type ActiveModule = 'pos' | 'inventory' | 'reports' | 'security' | 'team' | 'platform';

// ─── Auth / Roles ─────────────────────────────────────────────────────────────

export type Role = 'platform_admin' | 'store_admin' | 'cashier';

export interface User {
  id:        string;
  storeId:   string | null;   // null for platform_admin
  role:      Role;
  name:      string;
  username?: string;           // store_admin + platform_admin only
  active:    boolean;
}

export interface Store {
  id:            string;
  name:          string;
  ownerPhone:    string;
  deviceId:      string;
  licenseStatus: 'active' | 'suspended' | 'cancelled';
  lockDay:       number;
  createdAt:     number;
}

export interface Return {
  id:          string;
  saleId:      string;
  number:      number;
  total:       number;
  reason?:     string;
  items:       ReturnItem[];
  cashierId?:  string | null;
  cashierName?: string | null;
  timestamp:   Date;
}

export interface ReturnItem {
  productId: string;
  name:      string;
  price:     number;
  quantity:  number;
  subtotal:  number;
}

export interface CashReconciliation {
  id:           string;
  expectedCash: number;
  declaredCash: number;
  difference:   number;
  notes?:       string;
  cashierName?: string;
  shiftStart:   number;
  shiftEnd:     number;
}
