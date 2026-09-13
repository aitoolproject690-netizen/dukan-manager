import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('dukaan.db');
  await initSchema(_db);
  return _db;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export async function getNextInvoiceNumber(db: SQLite.SQLiteDatabase, prefix: string = 'INV'): Promise<string> {
  const row = await db.getFirstAsync<{ counter: number }>('UPDATE invoice_counter SET counter = counter + 1 WHERE id = 1 RETURNING counter');
  const next = row?.counter ?? 0;
  if (next <= 0) throw new Error('Could not generate invoice number.');
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

export function startOfDay(date: Date = new Date()): number { const d = new Date(date); d.setHours(0,0,0,0); return d.getTime(); }
export function endOfDay(date: Date = new Date()): number { const d = new Date(date); d.setHours(23,59,59,999); return d.getTime(); }
export function startOfMonth(date: Date = new Date()): number { return new Date(date.getFullYear(), date.getMonth(), 1).getTime(); }
export function endOfMonth(date: Date = new Date()): number { return new Date(date.getFullYear(), date.getMonth()+1, 0, 23,59,59,999).getTime(); }
export function startOfWeek(date: Date = new Date()): number { const d=new Date(date); const day=d.getDay(); d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d.getTime(); }
export function startOfYear(date: Date = new Date()): number { return new Date(date.getFullYear(),0,1).getTime(); }
export function formatDate(ts:number):string { const d=new Date(ts); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
export function formatTime(ts:number):string { const d=new Date(ts); const h=d.getHours(); const m=String(d.getMinutes()).padStart(2,'0'); return `${h%12||12}:${m} ${h>=12?'PM':'AM'}`; }

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, mobile TEXT DEFAULT '', photo_uri TEXT DEFAULT '', address TEXT DEFAULT '', notes TEXT DEFAULT '',
      credit_balance REAL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, barcode TEXT DEFAULT '', purchase_price REAL DEFAULT 0, selling_price REAL DEFAULT 0,
      stock REAL DEFAULT 0, low_stock_alert REAL DEFAULT 10, unit TEXT DEFAULT 'pcs', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY, customer_id TEXT, customer_name TEXT DEFAULT '', invoice_number TEXT NOT NULL, subtotal REAL NOT NULL,
      discount REAL DEFAULT 0, total REAL NOT NULL, payment_method TEXT NOT NULL, cash_amount REAL DEFAULT 0, upi_amount REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0, notes TEXT DEFAULT '', date INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT, product_name TEXT NOT NULL, quantity REAL NOT NULL, price REAL NOT NULL, purchase_price REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS khata_transactions (
      id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, note TEXT DEFAULT '', date INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, amount REAL NOT NULL, note TEXT DEFAULT '', date INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS invoice_counter (id INTEGER PRIMARY KEY, counter INTEGER DEFAULT 0);
    INSERT OR IGNORE INTO invoice_counter (id, counter) VALUES (1, 0);

    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_khata_customer_date ON khata_transactions(customer_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  `);

  // Backward-compatible migration for databases created before customer photos existed.
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(customers)');
  if (!columns.some(c => c.name === 'photo_uri')) {
    await db.execAsync("ALTER TABLE customers ADD COLUMN photo_uri TEXT DEFAULT ''");
  }

  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS prevent_negative_product_stock
    BEFORE UPDATE OF stock ON products WHEN NEW.stock < 0 BEGIN
      SELECT RAISE(ABORT, 'Insufficient stock: stock cannot be negative');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_negative_product_values
    BEFORE INSERT ON products WHEN NEW.purchase_price < 0 OR NEW.selling_price < 0 OR NEW.stock < 0 OR NEW.low_stock_alert < 0 BEGIN
      SELECT RAISE(ABORT, 'Product values cannot be negative');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_invalid_product_updates
    BEFORE UPDATE OF purchase_price, selling_price, stock, low_stock_alert ON products
    WHEN NEW.purchase_price < 0 OR NEW.selling_price < 0 OR NEW.stock < 0 OR NEW.low_stock_alert < 0 BEGIN
      SELECT RAISE(ABORT, 'Product values cannot be negative');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_invalid_khata_transaction
    BEFORE INSERT ON khata_transactions WHEN NEW.amount <= 0 OR NEW.type NOT IN ('credit', 'payment') BEGIN
      SELECT RAISE(ABORT, 'Khata transaction must have a positive amount and valid type');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_invalid_sale_item
    BEFORE INSERT ON sale_items WHEN NEW.quantity <= 0 OR NEW.price < 0 OR NEW.purchase_price < 0 BEGIN
      SELECT RAISE(ABORT, 'Sale item values are invalid');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_sale_without_parent
    BEFORE INSERT ON sale_items WHEN (SELECT COUNT(*) FROM sales WHERE id = NEW.sale_id) = 0 BEGIN
      SELECT RAISE(ABORT, 'Sale item must belong to an existing sale');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_sale_payment_mismatch
    BEFORE INSERT ON sales
    WHEN ABS((COALESCE(NEW.cash_amount,0) + COALESCE(NEW.upi_amount,0) + COALESCE(NEW.credit_amount,0)) - COALESCE(NEW.total,0)) > 0.01
      OR NEW.total < 0 OR NEW.discount < 0 OR NEW.subtotal < 0 OR NEW.cash_amount < 0 OR NEW.upi_amount < 0 OR NEW.credit_amount < 0 BEGIN
      SELECT RAISE(ABORT, 'Sale payment totals do not match bill total');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_credit_without_customer
    BEFORE INSERT ON sales WHEN NEW.credit_amount > 0 AND (NEW.customer_id IS NULL OR (SELECT COUNT(*) FROM customers WHERE id = NEW.customer_id) = 0) BEGIN
      SELECT RAISE(ABORT, 'Credit sale requires an existing customer');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_invalid_sale_item_product
    BEFORE INSERT ON sale_items WHEN NEW.product_id IS NOT NULL AND (SELECT COUNT(*) FROM products WHERE id = NEW.product_id) = 0 BEGIN
      SELECT RAISE(ABORT, 'Sale item product does not exist');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_negative_expense
    BEFORE INSERT ON expenses WHEN NEW.amount <= 0 BEGIN
      SELECT RAISE(ABORT, 'Expense amount must be greater than zero');
    END;
    CREATE TRIGGER IF NOT EXISTS prevent_invalid_expense_update
    BEFORE UPDATE OF amount ON expenses WHEN NEW.amount <= 0 BEGIN
      SELECT RAISE(ABORT, 'Expense amount must be greater than zero');
    END;
  `);
}

export async function exportDatabaseJSON(db: SQLite.SQLiteDatabase): Promise<string> {
  const customers=await db.getAllAsync('SELECT * FROM customers');
  const products=await db.getAllAsync('SELECT * FROM products');
  const sales=await db.getAllAsync('SELECT * FROM sales');
  const saleItems=await db.getAllAsync('SELECT * FROM sale_items');
  const khata=await db.getAllAsync('SELECT * FROM khata_transactions');
  const expenses=await db.getAllAsync('SELECT * FROM expenses');
  const settings=await db.getAllAsync('SELECT * FROM settings');
  const counter=await db.getAllAsync('SELECT * FROM invoice_counter');
  return JSON.stringify({customers,products,sales,saleItems,khata,expenses,settings,counter,exportedAt:Date.now()},null,2);
}

export async function importDatabaseJSON(db: SQLite.SQLiteDatabase, json: string): Promise<void> {
  const data=JSON.parse(json);
  await db.withTransactionAsync(async()=>{
    await db.execAsync(`DELETE FROM sale_items; DELETE FROM khata_transactions; DELETE FROM sales; DELETE FROM customers; DELETE FROM products; DELETE FROM expenses; DELETE FROM settings; DELETE FROM invoice_counter;`);
    for(const c of data.customers??[]) await db.runAsync('INSERT OR REPLACE INTO customers (id,name,mobile,photo_uri,address,notes,credit_balance,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',[c.id,c.name,c.mobile||'',c.photo_uri||'',c.address||'',c.notes||'',c.credit_balance||0,c.created_at,c.updated_at]);
    for(const p of data.products??[]) await db.runAsync('INSERT OR REPLACE INTO products VALUES (?,?,?,?,?,?,?,?,?,?)',[p.id,p.name,p.barcode,p.purchase_price,p.selling_price,p.stock,p.low_stock_alert,p.unit,p.created_at,p.updated_at]);
    for(const s of data.sales??[]) await db.runAsync('INSERT OR REPLACE INTO sales VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[s.id,s.customer_id,s.customer_name,s.invoice_number,s.subtotal,s.discount,s.total,s.payment_method,s.cash_amount,s.upi_amount,s.credit_amount,s.notes,s.date,s.created_at]);
    for(const si of data.saleItems??[]) await db.runAsync('INSERT OR REPLACE INTO sale_items VALUES (?,?,?,?,?,?,?)',[si.id,si.sale_id,si.product_id,si.product_name,si.quantity,si.price,si.purchase_price]);
    for(const k of data.khata??[]) await db.runAsync('INSERT OR REPLACE INTO khata_transactions VALUES (?,?,?,?,?,?,?)',[k.id,k.customer_id,k.type,k.amount,k.note,k.date,k.created_at]);
    for(const e of data.expenses??[]) await db.runAsync('INSERT OR REPLACE INTO expenses VALUES (?,?,?,?,?,?)',[e.id,e.category,e.amount,e.note,e.date,e.created_at]);
    for(const sv of data.settings??[]) await db.runAsync('INSERT OR REPLACE INTO settings VALUES (?,?)',[sv.key,sv.value]);
    for(const ic of data.counter??[]) await db.runAsync('INSERT OR REPLACE INTO invoice_counter VALUES (?,?)',[ic.id,ic.counter]);
  });
}
