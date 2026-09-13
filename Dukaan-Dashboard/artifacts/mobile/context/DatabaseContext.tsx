import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import {
  getDB, generateId, getNextInvoiceNumber,
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, startOfYear
} from '@/db/database';
import { Customer, Product, Sale, SaleItem, KhataTransaction, Expense, DashboardData, CartItem } from '@/types';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isReady: boolean;

  // Customers
  customers: Customer[];
  refreshCustomers: () => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id' | 'credit_balance' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Promise<Customer | null>;

  // Products
  products: Product[];
  refreshProducts: () => Promise<void>;
  addProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => Promise<Product | null>;
  updateStock: (id: string, delta: number) => Promise<void>;
  getLowStockProducts: () => Product[];

  // Sales
  addSale: (
    saleData: Omit<Sale, 'id' | 'invoice_number' | 'created_at' | 'items'>,
    items: CartItem[],
    invoicePrefix?: string
  ) => Promise<Sale>;
  getSales: (startDate?: number, endDate?: number) => Promise<Sale[]>;
  getSaleWithItems: (id: string) => Promise<Sale | null>;
  deleteSale: (id: string) => Promise<void>;

  // Khata
  getCustomerTransactions: (customerId: string) => Promise<KhataTransaction[]>;
  addKhataTransaction: (data: Omit<KhataTransaction, 'id' | 'created_at'>) => Promise<KhataTransaction>;
  deleteKhataTransaction: (id: string, customerId: string, type: 'credit' | 'payment', amount: number) => Promise<void>;

  // Expenses
  expenses: Expense[];
  refreshExpenses: () => Promise<void>;
  addExpense: (data: Omit<Expense, 'id' | 'created_at'>) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpenses: (startDate?: number, endDate?: number) => Promise<Expense[]>;

  // Dashboard & Reports
  getDashboardData: () => Promise<DashboardData>;
  getReportData: (start: number, end: number) => Promise<{
    sales: number; profit: number; expenses: number;
    cash: number; upi: number; credit: number;
    saleCount: number; expenseCount: number;
  }>;
  getMonthlyBreakdown: (year: number) => Promise<Array<{ month: number; sales: number; profit: number; expenses: number }>>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    getDB().then(database => {
      setDb(database);
      setIsReady(true);
      loadInitialData(database);
    }).catch(console.error);
  }, []);

  async function loadInitialData(database: SQLite.SQLiteDatabase) {
    const [c, p, e] = await Promise.all([
      database.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name ASC'),
      database.getAllAsync<Product>('SELECT * FROM products ORDER BY name ASC'),
      database.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY date DESC LIMIT 200'),
    ]);
    setCustomers(c);
    setProducts(p);
    setExpenses(e);
  }

  const refreshCustomers = useCallback(async () => {
    if (!db) return;
    const rows = await db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY name ASC');
    setCustomers(rows);
  }, [db]);

  const refreshProducts = useCallback(async () => {
    if (!db) return;
    const rows = await db.getAllAsync<Product>('SELECT * FROM products ORDER BY name ASC');
    setProducts(rows);
  }, [db]);

  const refreshExpenses = useCallback(async () => {
    if (!db) return;
    const rows = await db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY date DESC LIMIT 200');
    setExpenses(rows);
  }, [db]);

  const addCustomer = useCallback(async (data: Omit<Customer, 'id' | 'credit_balance' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    if (!db) throw new Error('DB not ready');
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO customers (id, name, mobile, address, notes, credit_balance, created_at, updated_at) VALUES (?,?,?,?,?,0,?,?)',
      [id, data.name, data.mobile || '', data.address || '', data.notes || '', now, now]
    );
    const customer: Customer = { id, ...data, mobile: data.mobile || '', address: data.address || '', notes: data.notes || '', credit_balance: 0, created_at: now, updated_at: now };
    setCustomers(prev => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
    return customer;
  }, [db]);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    if (!db) throw new Error('DB not ready');
    const now = Date.now();
    await db.runAsync(
      'UPDATE customers SET name=COALESCE(?,name), mobile=COALESCE(?,mobile), address=COALESCE(?,address), notes=COALESCE(?,notes), updated_at=? WHERE id=?',
      [data.name ?? null, data.mobile ?? null, data.address ?? null, data.notes ?? null, now, id]
    );
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data, updated_at: now } : c).sort((a, b) => a.name.localeCompare(b.name)));
  }, [db]);

  const deleteCustomer = useCallback(async (id: string) => {
    if (!db) throw new Error('DB not ready');
    await db.runAsync('DELETE FROM khata_transactions WHERE customer_id=?', [id]);
    await db.runAsync('DELETE FROM customers WHERE id=?', [id]);
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, [db]);

  const getCustomer = useCallback(async (id: string): Promise<Customer | null> => {
    if (!db) return null;
    return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id=?', [id]);
  }, [db]);

  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> => {
    if (!db) throw new Error('DB not ready');
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO products (id, name, barcode, purchase_price, selling_price, stock, low_stock_alert, unit, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, data.name, data.barcode || '', data.purchase_price, data.selling_price, data.stock, data.low_stock_alert, data.unit || 'pcs', now, now]
    );
    const product: Product = { id, ...data, barcode: data.barcode || '', unit: data.unit || 'pcs', created_at: now, updated_at: now };
    setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
    return product;
  }, [db]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>) => {
    if (!db) throw new Error('DB not ready');
    const now = Date.now();
    await db.runAsync(
      'UPDATE products SET name=COALESCE(?,name), barcode=COALESCE(?,barcode), purchase_price=COALESCE(?,purchase_price), selling_price=COALESCE(?,selling_price), stock=COALESCE(?,stock), low_stock_alert=COALESCE(?,low_stock_alert), unit=COALESCE(?,unit), updated_at=? WHERE id=?',
      [data.name ?? null, data.barcode ?? null, data.purchase_price ?? null, data.selling_price ?? null, data.stock ?? null, data.low_stock_alert ?? null, data.unit ?? null, now, id]
    );
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data, updated_at: now } : p).sort((a, b) => a.name.localeCompare(b.name)));
  }, [db]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!db) throw new Error('DB not ready');
    await db.runAsync('DELETE FROM products WHERE id=?', [id]);
    setProducts(prev => prev.filter(p => p.id !== id));
  }, [db]);

  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    if (!db) return null;
    return db.getFirstAsync<Product>('SELECT * FROM products WHERE id=?', [id]);
  }, [db]);

  const updateStock = useCallback(async (id: string, delta: number) => {
    if (!db) return;
    await db.runAsync('UPDATE products SET stock = stock + ?, updated_at=? WHERE id=?', [delta, Date.now(), id]);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  }, [db]);

  const getLowStockProducts = useCallback((): Product[] => {
    return products.filter(p => p.stock <= p.low_stock_alert);
  }, [products]);

  const addSale = useCallback(async (
    saleData: Omit<Sale, 'id' | 'invoice_number' | 'created_at' | 'items'>,
    items: CartItem[],
    invoicePrefix: string = 'INV'
  ): Promise<Sale> => {
    if (!db) throw new Error('DB not ready');
    const id = generateId();
    const now = Date.now();
    const invoice_number = await getNextInvoiceNumber(db, invoicePrefix);

    await db.runAsync(
      'INSERT INTO sales (id, customer_id, customer_name, invoice_number, subtotal, discount, total, payment_method, cash_amount, upi_amount, credit_amount, notes, date, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, saleData.customer_id ?? null, saleData.customer_name || '', invoice_number, saleData.subtotal, saleData.discount, saleData.total, saleData.payment_method, saleData.cash_amount, saleData.upi_amount, saleData.credit_amount, saleData.notes || '', saleData.date, now]
    );

    const saleItems: SaleItem[] = [];
    for (const item of items) {
      const itemId = generateId();
      await db.runAsync(
        'INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, price, purchase_price) VALUES (?,?,?,?,?,?,?)',
        [itemId, id, item.product_id ?? null, item.product_name, item.quantity, item.price, item.purchase_price]
      );
      saleItems.push({ id: itemId, sale_id: id, ...item });
      // Reduce stock
      if (item.product_id) {
        await db.runAsync('UPDATE products SET stock = MAX(0, stock - ?) WHERE id=?', [item.quantity, item.product_id]);
        setProducts(prev => prev.map(p => p.id === item.product_id ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p));
      }
    }

    // Update customer credit if credit sale
    if (saleData.customer_id && saleData.credit_amount > 0) {
      await db.runAsync('UPDATE customers SET credit_balance = credit_balance + ?, updated_at=? WHERE id=?', [saleData.credit_amount, now, saleData.customer_id]);
      // Add khata entry
      const txId = generateId();
      await db.runAsync(
        'INSERT INTO khata_transactions (id, customer_id, type, amount, note, date, created_at) VALUES (?,?,?,?,?,?,?)',
        [txId, saleData.customer_id, 'credit', saleData.credit_amount, `Bill ${invoice_number}`, saleData.date, now]
      );
      setCustomers(prev => prev.map(c => c.id === saleData.customer_id ? { ...c, credit_balance: c.credit_balance + saleData.credit_amount } : c));
    }

    return { id, ...saleData, invoice_number, created_at: now, items: saleItems };
  }, [db]);

  const getSales = useCallback(async (startDate?: number, endDate?: number): Promise<Sale[]> => {
    if (!db) return [];
    if (startDate && endDate) {
      return db.getAllAsync<Sale>('SELECT * FROM sales WHERE date >= ? AND date <= ? ORDER BY date DESC', [startDate, endDate]);
    }
    return db.getAllAsync<Sale>('SELECT * FROM sales ORDER BY date DESC LIMIT 500');
  }, [db]);

  const getSaleWithItems = useCallback(async (id: string): Promise<Sale | null> => {
    if (!db) return null;
    const sale = await db.getFirstAsync<Sale>('SELECT * FROM sales WHERE id=?', [id]);
    if (!sale) return null;
    const items = await db.getAllAsync<SaleItem>('SELECT * FROM sale_items WHERE sale_id=?', [id]);
    return { ...sale, items };
  }, [db]);

  const deleteSale = useCallback(async (id: string) => {
    if (!db) return;
    const sale = await db.getFirstAsync<Sale>('SELECT * FROM sales WHERE id=?', [id]);
    if (!sale) return;
    const items = await db.getAllAsync<SaleItem>('SELECT * FROM sale_items WHERE sale_id=?', [id]);
    // Restore stock
    for (const item of items) {
      if (item.product_id) {
        await db.runAsync('UPDATE products SET stock = stock + ? WHERE id=?', [item.quantity, item.product_id]);
        setProducts(prev => prev.map(p => p.id === item.product_id ? { ...p, stock: p.stock + item.quantity } : p));
      }
    }
    // Remove credit if needed
    if (sale.customer_id && sale.credit_amount > 0) {
      await db.runAsync('UPDATE customers SET credit_balance = MAX(0, credit_balance - ?) WHERE id=?', [sale.credit_amount, sale.customer_id]);
      setCustomers(prev => prev.map(c => c.id === sale.customer_id ? { ...c, credit_balance: Math.max(0, c.credit_balance - sale.credit_amount) } : c));
    }
    await db.runAsync('DELETE FROM sale_items WHERE sale_id=?', [id]);
    await db.runAsync('DELETE FROM sales WHERE id=?', [id]);
  }, [db]);

  const getCustomerTransactions = useCallback(async (customerId: string): Promise<KhataTransaction[]> => {
    if (!db) return [];
    return db.getAllAsync<KhataTransaction>('SELECT * FROM khata_transactions WHERE customer_id=? ORDER BY date DESC', [customerId]);
  }, [db]);

  const addKhataTransaction = useCallback(async (data: Omit<KhataTransaction, 'id' | 'created_at'>): Promise<KhataTransaction> => {
    if (!db) throw new Error('DB not ready');
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO khata_transactions (id, customer_id, type, amount, note, date, created_at) VALUES (?,?,?,?,?,?,?)',
      [id, data.customer_id, data.type, data.amount, data.note || '', data.date, now]
    );
    // Update customer balance
    const delta = data.type === 'credit' ? data.amount : -data.amount;
    await db.runAsync('UPDATE customers SET credit_balance = MAX(0, credit_balance + ?), updated_at=? WHERE id=?', [delta, now, data.customer_id]);
    setCustomers(prev => prev.map(c => c.id === data.customer_id ? { ...c, credit_balance: Math.max(0, c.credit_balance + delta) } : c));
    return { id, ...data, created_at: now };
  }, [db]);

  const deleteKhataTransaction = useCallback(async (id: string, customerId: string, type: 'credit' | 'payment', amount: number) => {
    if (!db) return;
    await db.runAsync('DELETE FROM khata_transactions WHERE id=?', [id]);
    const delta = type === 'credit' ? -amount : amount;
    await db.runAsync('UPDATE customers SET credit_balance = MAX(0, credit_balance + ?), updated_at=? WHERE id=?', [delta, Date.now(), customerId]);
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, credit_balance: Math.max(0, c.credit_balance + delta) } : c));
  }, [db]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> => {
    if (!db) throw new Error('DB not ready');
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO expenses (id, category, amount, note, date, created_at) VALUES (?,?,?,?,?,?)',
      [id, data.category, data.amount, data.note || '', data.date, now]
    );
    const expense: Expense = { id, ...data, note: data.note || '', created_at: now };
    setExpenses(prev => [expense, ...prev]);
    return expense;
  }, [db]);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    if (!db) return;
    await db.runAsync(
      'UPDATE expenses SET category=COALESCE(?,category), amount=COALESCE(?,amount), note=COALESCE(?,note), date=COALESCE(?,date) WHERE id=?',
      [data.category ?? null, data.amount ?? null, data.note ?? null, data.date ?? null, id]
    );
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  }, [db]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!db) return;
    await db.runAsync('DELETE FROM expenses WHERE id=?', [id]);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, [db]);

  const getExpenses = useCallback(async (startDate?: number, endDate?: number): Promise<Expense[]> => {
    if (!db) return [];
    if (startDate && endDate) {
      return db.getAllAsync<Expense>('SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC', [startDate, endDate]);
    }
    return db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY date DESC LIMIT 500');
  }, [db]);

  const getDashboardData = useCallback(async (): Promise<DashboardData> => {
    if (!db) return {
      today_sales: 0, today_profit: 0, today_cash: 0, today_upi: 0,
      today_credit: 0, total_pending_credit: 0, monthly_sales: 0,
      monthly_profit: 0, monthly_expenses: 0, today_expenses: 0
    };
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    const [todaySales, monthlySales, todayExpenses, monthlyExpenses, creditSums] = await Promise.all([
      db.getAllAsync<{ total: number; cash_amount: number; upi_amount: number; credit_amount: number; subtotal: number; items_cost: number }>(
        `SELECT s.total, s.cash_amount, s.upi_amount, s.credit_amount, s.subtotal,
          COALESCE((SELECT SUM(si.quantity * si.purchase_price) FROM sale_items si WHERE si.sale_id = s.id), 0) as items_cost
         FROM sales s WHERE s.date >= ? AND s.date <= ?`,
        [todayStart, todayEnd]
      ),
      db.getAllAsync<{ total: number; items_cost: number }>(
        `SELECT s.total,
          COALESCE((SELECT SUM(si.quantity * si.purchase_price) FROM sale_items si WHERE si.sale_id = s.id), 0) as items_cost
         FROM sales s WHERE s.date >= ? AND s.date <= ?`,
        [monthStart, monthEnd]
      ),
      db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?', [todayStart, todayEnd]),
      db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?', [monthStart, monthEnd]),
      db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(credit_balance), 0) as total FROM customers'),
    ]);

    const today_sales = todaySales.reduce((s, r) => s + r.total, 0);
    const today_profit = todaySales.reduce((s, r) => s + (r.total - r.items_cost), 0);
    const today_cash = todaySales.reduce((s, r) => s + r.cash_amount, 0);
    const today_upi = todaySales.reduce((s, r) => s + r.upi_amount, 0);
    const today_credit = todaySales.reduce((s, r) => s + r.credit_amount, 0);
    const monthly_sales = monthlySales.reduce((s, r) => s + r.total, 0);
    const monthly_profit = monthlySales.reduce((s, r) => s + (r.total - r.items_cost), 0);

    return {
      today_sales, today_profit, today_cash, today_upi, today_credit,
      total_pending_credit: creditSums?.total ?? 0,
      monthly_sales, monthly_profit,
      monthly_expenses: monthlyExpenses?.total ?? 0,
      today_expenses: todayExpenses?.total ?? 0,
    };
  }, [db]);

  const getReportData = useCallback(async (start: number, end: number) => {
    if (!db) return { sales: 0, profit: 0, expenses: 0, cash: 0, upi: 0, credit: 0, saleCount: 0, expenseCount: 0 };

    const [salesRows, expRow] = await Promise.all([
      db.getAllAsync<{ total: number; cash_amount: number; upi_amount: number; credit_amount: number; items_cost: number }>(
        `SELECT s.total, s.cash_amount, s.upi_amount, s.credit_amount,
          COALESCE((SELECT SUM(si.quantity * si.purchase_price) FROM sale_items si WHERE si.sale_id = s.id), 0) as items_cost
         FROM sales s WHERE s.date >= ? AND s.date <= ?`,
        [start, end]
      ),
      db.getFirstAsync<{ total: number; cnt: number }>('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as cnt FROM expenses WHERE date >= ? AND date <= ?', [start, end]),
    ]);

    return {
      sales: salesRows.reduce((s, r) => s + r.total, 0),
      profit: salesRows.reduce((s, r) => s + (r.total - r.items_cost), 0),
      expenses: expRow?.total ?? 0,
      cash: salesRows.reduce((s, r) => s + r.cash_amount, 0),
      upi: salesRows.reduce((s, r) => s + r.upi_amount, 0),
      credit: salesRows.reduce((s, r) => s + r.credit_amount, 0),
      saleCount: salesRows.length,
      expenseCount: expRow?.cnt ?? 0,
    };
  }, [db]);

  const getMonthlyBreakdown = useCallback(async (year: number) => {
    if (!db) return [];
    const result: Array<{ month: number; sales: number; profit: number; expenses: number }> = [];
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1).getTime();
      const end = new Date(year, m + 1, 0, 23, 59, 59, 999).getTime();
      const salesRows = await db.getAllAsync<{ total: number; items_cost: number }>(
        `SELECT s.total, COALESCE((SELECT SUM(si.quantity * si.purchase_price) FROM sale_items si WHERE si.sale_id = s.id), 0) as items_cost FROM sales s WHERE s.date >= ? AND s.date <= ?`,
        [start, end]
      );
      const expRow = await db.getFirstAsync<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?', [start, end]);
      result.push({
        month: m,
        sales: salesRows.reduce((s, r) => s + r.total, 0),
        profit: salesRows.reduce((s, r) => s + (r.total - r.items_cost), 0),
        expenses: expRow?.total ?? 0,
      });
    }
    return result;
  }, [db]);

  return (
    <DatabaseContext.Provider value={{
      db, isReady,
      customers, refreshCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomer,
      products, refreshProducts, addProduct, updateProduct, deleteProduct, getProduct, updateStock, getLowStockProducts,
      addSale, getSales, getSaleWithItems, deleteSale,
      getCustomerTransactions, addKhataTransaction, deleteKhataTransaction,
      expenses, refreshExpenses, addExpense, updateExpense, deleteExpense, getExpenses,
      getDashboardData, getReportData, getMonthlyBreakdown,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
