import * as SQLite from 'expo-sqlite';

/**
 * Hardens the local outbox for concurrent/offline devices.
 * Update operations get unique mutation IDs and carry balance/stock deltas,
 * so concurrent sales/payments are accumulated instead of last-write-wins.
 */
export async function ensureSyncTriggerMigration(db: SQLite.SQLiteDatabase): Promise<void> {
  const applied = await db.getFirstAsync<{ value: string }>("SELECT value FROM sync_state WHERE key='sync_trigger_v2'");
  if (applied?.value === '1') return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DROP TRIGGER IF EXISTS sync_customer_update;
      DROP TRIGGER IF EXISTS sync_product_update;

      CREATE TRIGGER sync_customer_update AFTER UPDATE ON customers
      WHEN COALESCE((SELECT value FROM sync_state WHERE key='sync_applying'),'0') <> '1'
      BEGIN
        INSERT OR REPLACE INTO sync_queue(id,operation_id,entity,entity_id,operation,payload,created_at,retry_count,last_error,synced_at)
        VALUES(
          'customer-update:'||NEW.id||':'||NEW.updated_at,
          'customer-update:'||NEW.id||':'||NEW.updated_at,
          'customer',NEW.id,'update',
          json_object('id',NEW.id,'name',NEW.name,'mobile',NEW.mobile,'photo_uri',NEW.photo_uri,'address',NEW.address,'notes',NEW.notes,
            'credit_balance',NEW.credit_balance,'credit_delta',NEW.credit_balance-OLD.credit_balance,
            'created_at',NEW.created_at,'updated_at',NEW.updated_at),
          strftime('%s','now')*1000,0,'',NULL
        );
      END;

      CREATE TRIGGER sync_product_update AFTER UPDATE ON products
      WHEN COALESCE((SELECT value FROM sync_state WHERE key='sync_applying'),'0') <> '1'
      BEGIN
        INSERT OR REPLACE INTO sync_queue(id,operation_id,entity,entity_id,operation,payload,created_at,retry_count,last_error,synced_at)
        VALUES(
          'product-update:'||NEW.id||':'||NEW.updated_at,
          'product-update:'||NEW.id||':'||NEW.updated_at,
          'product',NEW.id,'update',
          json_object('id',NEW.id,'name',NEW.name,'barcode',NEW.barcode,'purchase_price',NEW.purchase_price,'selling_price',NEW.selling_price,
            'stock',NEW.stock,'stock_delta',NEW.stock-OLD.stock,'low_stock_alert',NEW.low_stock_alert,'unit',NEW.unit,
            'created_at',NEW.created_at,'updated_at',NEW.updated_at),
          strftime('%s','now')*1000,0,'',NULL
        );
      END;
    `);
    await db.runAsync("INSERT OR REPLACE INTO sync_state(key,value) VALUES('sync_trigger_v2','1')");
  });
}
