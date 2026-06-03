/**
 * Vela POS – temporary in-memory backend
 *
 * Uses SQLite :memory: → all data is lost on server restart.
 * No authentication, no file persistence.
 */

import express from 'express';
import Database from 'better-sqlite3';

const PORT = 3001;

// ─── In-memory database ───────────────────────────────────────────────────────
const db = new Database(':memory:');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    barcode     TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    cost_price  REAL NOT NULL DEFAULT 0,
    stock       INTEGER NOT NULL DEFAULT 0,
    min_stock   INTEGER NOT NULL DEFAULT 5,
    category    TEXT NOT NULL DEFAULT 'Outros',
    unit        TEXT NOT NULL DEFAULT 'Un',
    tax_exempt              INTEGER NOT NULL DEFAULT 0,
    requires_prescription   INTEGER NOT NULL DEFAULT 0,
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sales (
    id              TEXT PRIMARY KEY,
    number          INTEGER NOT NULL,
    subtotal        REAL NOT NULL,
    tax             REAL NOT NULL,
    total           REAL NOT NULL,
    payment_method  TEXT NOT NULL,
    timestamp_ms    INTEGER NOT NULL,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id          TEXT PRIMARY KEY,
    sale_id     TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id  TEXT NOT NULL,
    barcode     TEXT NOT NULL,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    quantity    INTEGER NOT NULL,
    discount    REAL NOT NULL DEFAULT 0,
    subtotal    REAL NOT NULL,
    unit        TEXT NOT NULL DEFAULT 'Un'
  );
`);

const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products
    (id, barcode, name, price, cost_price, stock, min_stock, category, unit, tax_exempt, requires_prescription, updated_at)
  VALUES
    (@id, @barcode, @name, @price, @cost_price, @stock, @min_stock, @category, @unit, @tax_exempt, @requires_prescription, unixepoch())
`);

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Simple CORS for local dev
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  next();
});
app.options('*', (_req, res) => { res.sendStatus(204); });

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'in-memory', ts: Date.now() });
});

// ── Products ──────────────────────────────────────────────────────────────────
app.get('/api/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY name').all() as any[];
  res.json(rows.map(toProduct));
});

app.put('/api/products/:id', (req, res) => {
  const p = { ...req.body, id: req.params.id };
  try {
    insertProduct.run({
      id:                   p.id,
      barcode:              p.barcode ?? '',
      name:                 p.name ?? '',
      price:                p.price ?? 0,
      cost_price:           p.costPrice ?? 0,
      stock:                p.stock ?? 0,
      min_stock:            p.minStock ?? 5,
      category:             p.category ?? 'Outros',
      unit:                 p.unit ?? 'Un',
      tax_exempt:           p.taxExempt ? 1 : 0,
      requires_prescription:p.requiresPrescription ? 1 : 0,
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/products/:id/stock', (req, res) => {
  const { stock } = req.body as { stock: number };
  if (typeof stock !== 'number') return res.status(400).json({ error: 'stock must be a number' });
  db.prepare('UPDATE products SET stock = ?, updated_at = unixepoch() WHERE id = ?').run(stock, req.params.id);
  res.json({ ok: true });
});

// ── Sales ─────────────────────────────────────────────────────────────────────
app.get('/api/sales', (_req, res) => {
  const sales = db.prepare('SELECT * FROM sales ORDER BY timestamp_ms DESC').all() as any[];
  const items = db.prepare('SELECT * FROM sale_items').all() as any[];

  const itemsBySale = new Map<string, any[]>();
  for (const item of items) {
    if (!itemsBySale.has(item.sale_id)) itemsBySale.set(item.sale_id, []);
    itemsBySale.get(item.sale_id)!.push(item);
  }

  res.json(sales.map(s => ({
    id:            s.id,
    number:        s.number,
    subtotal:      s.subtotal,
    tax:           s.tax,
    total:         s.total,
    paymentMethod: s.payment_method,
    timestamp:     new Date(s.timestamp_ms).toISOString(),
    items:         (itemsBySale.get(s.id) ?? []).map(i => ({
      productId: i.product_id,
      barcode:   i.barcode,
      name:      i.name,
      price:     i.price,
      quantity:  i.quantity,
      discount:  i.discount,
      subtotal:  i.subtotal,
      unit:      i.unit,
    })),
  })));
});

app.post('/api/sales', (req, res) => {
  const sale = req.body as any;
  if (!sale?.id || !sale?.items?.length) {
    return res.status(400).json({ error: 'invalid sale payload' });
  }

  const insertSale = db.prepare(`
    INSERT INTO sales (id, number, subtotal, tax, total, payment_method, timestamp_ms)
    VALUES (@id, @number, @subtotal, @tax, @total, @payment_method, @timestamp_ms)
  `);
  const insertItem = db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, barcode, name, price, quantity, discount, subtotal, unit)
    VALUES (@id, @sale_id, @product_id, @barcode, @name, @price, @quantity, @discount, @subtotal, @unit)
  `);
  const deductStock = db.prepare(`
    UPDATE products SET stock = MAX(0, stock - ?), updated_at = unixepoch() WHERE id = ?
  `);

  const commit = db.transaction(() => {
    insertSale.run({
      id:             sale.id,
      number:         sale.number,
      subtotal:       sale.subtotal,
      tax:            sale.tax,
      total:          sale.total,
      payment_method: sale.paymentMethod,
      timestamp_ms:   new Date(sale.timestamp).getTime(),
    });
    for (const item of sale.items) {
      insertItem.run({
        id:         crypto.randomUUID(),
        sale_id:    sale.id,
        product_id: item.productId,
        barcode:    item.barcode,
        name:       item.name,
        price:      item.price,
        quantity:   item.quantity,
        discount:   item.discount ?? 0,
        subtotal:   item.subtotal,
        unit:       item.unit,
      });
      deductStock.run(item.quantity, item.productId);
    }
  });

  try {
    commit();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Summary (for reports) ─────────────────────────────────────────────────────
app.get('/api/reports/summary', (_req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const todayRow = db.prepare(`
    SELECT COUNT(*) as tx, COALESCE(SUM(total),0) as revenue, COALESCE(SUM(tax),0) as tax
    FROM sales WHERE timestamp_ms >= ?
  `).get(todayMs) as any;

  const allRow = db.prepare(`
    SELECT COUNT(*) as tx, COALESCE(SUM(total),0) as revenue
    FROM sales
  `).get() as any;

  const stockValue = (db.prepare(`
    SELECT COALESCE(SUM(cost_price * stock),0) as val FROM products
  `).get() as any).val;

  const lowStock = (db.prepare(`
    SELECT COUNT(*) as c FROM products WHERE stock <= min_stock
  `).get() as any).c;

  res.json({
    today: {
      transactions: todayRow.tx,
      revenue:      todayRow.revenue,
      tax:          todayRow.tax,
    },
    allTime: {
      transactions: allRow.tx,
      revenue:      allRow.revenue,
    },
    inventory: {
      stockValue,
      lowStockCount: lowStock,
    },
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toProduct(row: any) {
  return {
    id:                   row.id,
    barcode:              row.barcode,
    name:                 row.name,
    price:                row.price,
    costPrice:            row.cost_price,
    stock:                row.stock,
    minStock:             row.min_stock,
    category:             row.category,
    unit:                 row.unit,
    taxExempt:            row.tax_exempt === 1,
    requiresPrescription: row.requires_prescription === 1,
  };
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🟢 Vela API  →  http://localhost:${PORT}/api`);
  console.log(`   Mode: in-memory SQLite (data resets on restart)`);
  console.log(`   No auth  ·  Empty — add products via the Inventory page\n`);
});
