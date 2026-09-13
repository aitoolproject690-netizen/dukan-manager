import * as SQLite from 'expo-sqlite';
import { setSyncState } from '@/db/database';

export type RemoteSyncOperation = {
  operationId: string;
  entity: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: number;
  serverAt: number;
  deviceId?: string;
};

function has<T extends object>(value: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

async function alreadyApplied(db: SQLite.SQLiteDatabase, operationId: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key=?', [`applied:${operationId}`]);
  return !!row;
}

async function markApplied(db: SQLite.SQLiteDatabase, operationId: string) {
  await setSyncState(db, `applied:${operationId}`, '1');
}

export async function applySyncOperation(db: SQLite.SQLiteDatabase, op: RemoteSyncOperation): Promise<void> {
  if (!op?.operationId || !op.entity || !op.entityId) return;
  if (await alreadyApplied(db, op.operationId)) return;

  await db.withTransactionAsync(async () => {
    if (op.entity === 'customer') {
      const p = op.payload ?? {};
      if (op.operation === 'delete') {
        await db.runAsync('DELETE FROM customers WHERE id=?', [op.entityId]);
      } else {
        await db.runAsync(
          `INSERT OR REPLACE INTO customers (id,name,mobile,photo_uri,address,notes,credit_balance,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [op.entityId, p.name ?? '', p.mobile ?? '', p.photo_uri ?? '', p.address ?? '', p.notes ?? '', Number(p.credit_balance ?? 0), Number(p.created_at ?? op.createdAt), Number(p.updated_at ?? op.createdAt)]
        );
      }
    } else if (op.entity === 'product') {
      const p = op.payload ?? {};
      if (op.operation === 'delete') {
        await db.runAsync('DELETE FROM products WHERE id=?', [op.entityId]);
      } else {
        await db.runAsync(
          `INSERT OR REPLACE INTO products (id,name,barcode,purchase_price,selling_price,stock,low_stock_alert,unit,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [op.entityId, p.name ?? '', p.barcode ?? '', Number(p.purchase_price ?? 0), Number(p.selling_price ?? 0), Number(p.stock ?? 0), Number(p.low_stock_alert ?? 10), p.unit ?? 'pcs', Number(p.created_at ?? op.createdAt), Number(p.updated_at ?? op.createdAt)]
        );
      }
    } else if (op.entity === 'expense') {
      const p = op.payload ?? {};
      if (op.operation === 'delete') await db.runAsync('DELETE FROM expenses WHERE id=?', [op.entityId]);
      else await db.runAsync('INSERT OR REPLACE INTO expenses (id,category,amount,note,date,created_at) VALUES (?,?,?,?,?,?)', [op.entityId, p.category ?? '', Number(p.amount ?? 0), p.note ?? '', Number(p.date ?? op.createdAt), Number(p.created_at ?? op.createdAt)]);
    } else if (op.entity === 'sale') {
      const p = op.payload ?? {};
      const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM sales WHERE id=?', [op.entityId]);
      if (op.operation === 'delete') {
        if (existing) {
          const items = await db.getAllAsync<{ product_id: string | null; quantity: number }>('SELECT product_id,quantity FROM sale_items WHERE sale_id=?', [op.entityId]);
          for (const item of items) if (item.product_id) await db.runAsync('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?', [Number(item.quantity), Date.now(), item.product_id]);
          await db.runAsync('DELETE FROM sale_items WHERE sale_id=?', [op.entityId]);
          await db.runAsync('DELETE FROM sales WHERE id=?', [op.entityId]);
        }
      } else if (!existing) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sales (id,customer_id,customer_name,invoice_number,subtotal,discount,total,payment_method,cash_amount,upi_amount,credit_amount,notes,date,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [op.entityId, p.customer_id ?? null, p.customer_name ?? '', p.invoice_number ?? op.entityId, Number(p.subtotal ?? 0), Number(p.discount ?? 0), Number(p.total ?? 0), p.payment_method ?? 'cash', Number(p.cash_amount ?? 0), Number(p.upi_amount ?? 0), Number(p.credit_amount ?? 0), p.notes ?? '', Number(p.date ?? op.createdAt), Number(p.created_at ?? op.createdAt)]
        );
        for (const item of Array.isArray(p.items) ? p.items : []) {
          await db.runAsync('INSERT OR IGNORE INTO sale_items (id,sale_id,product_id,product_name,quantity,price,purchase_price) VALUES (?,?,?,?,?,?,?)', [item.id, op.entityId, item.product_id ?? null, item.product_name ?? '', Number(item.quantity ?? 0), Number(item.price ?? 0), Number(item.purchase_price ?? 0)]);
          if (item.product_id) await db.runAsync('UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND stock>=?', [Number(item.quantity ?? 0), Date.now(), item.product_id, Number(item.quantity ?? 0)]);
        }
        if (p.customer_id && Number(p.credit_amount ?? 0) > 0) {
          await db.runAsync('UPDATE customers SET credit_balance=credit_balance+?,updated_at=? WHERE id=?', [Number(p.credit_amount), Date.now(), p.customer_id]);
          await db.runAsync('INSERT OR IGNORE INTO khata_transactions (id,customer_id,type,amount,note,date,created_at) VALUES (?,?,?,?,?,?,?)', [`sale-${op.entityId}`, p.customer_id, 'credit', Number(p.credit_amount), `Bill ${p.invoice_number ?? op.entityId}`, Number(p.date ?? op.createdAt), Number(p.created_at ?? op.createdAt)]);
        }
      }
    } else if (op.entity === 'khata_transaction') {
      const p = op.payload ?? {};
      const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM khata_transactions WHERE id=?', [op.entityId]);
      if (op.operation === 'delete') {
        if (existing) {
          const t = await db.getFirstAsync<{ customer_id: string; type: string; amount: number }>('SELECT customer_id,type,amount FROM khata_transactions WHERE id=?', [op.entityId]);
          if (t) {
            const delta = t.type === 'credit' ? -Number(t.amount) : Number(t.amount);
            await db.runAsync('UPDATE customers SET credit_balance=credit_balance+?,updated_at=? WHERE id=?', [delta, Date.now(), t.customer_id]);
          }
          await db.runAsync('DELETE FROM khata_transactions WHERE id=?', [op.entityId]);
        }
      } else if (!existing) {
        const amount = Number(p.amount ?? 0);
        const type = p.type === 'payment' ? 'payment' : 'credit';
        await db.runAsync('INSERT OR IGNORE INTO khata_transactions (id,customer_id,type,amount,note,date,created_at) VALUES (?,?,?,?,?,?,?)', [op.entityId, p.customer_id, type, amount, p.note ?? '', Number(p.date ?? op.createdAt), Number(p.created_at ?? op.createdAt)]);
        await db.runAsync('UPDATE customers SET credit_balance=credit_balance+?,updated_at=? WHERE id=?', [type === 'credit' ? amount : -amount, Date.now(), p.customer_id]);
      }
    }

    await markApplied(db, op.operationId);
  });
}

export async function applySyncBatch(db: SQLite.SQLiteDatabase, operations: RemoteSyncOperation[], cursor: number): Promise<number> {
  let next = cursor;
  for (const op of operations) {
    await applySyncOperation(db, op);
    next = Math.max(next, Number(op.serverAt) || 0);
  }
  return next;
}
