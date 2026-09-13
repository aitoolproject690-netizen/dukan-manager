import * as SQLite from 'expo-sqlite';
import { getPendingSyncOperations, getSyncState, markSyncOperationFailed, markSyncOperationSynced, setSyncState } from '@/db/database';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const SHOP_ID = process.env.EXPO_PUBLIC_SHOP_ID?.trim() || '';

export type SyncResult = { attempted: number; synced: number; failed: number; online: boolean };

async function getDeviceId(db: SQLite.SQLiteDatabase): Promise<string> {
  const existing = await getSyncState(db, 'device_id');
  if (existing) return existing;
  const id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await setSyncState(db, 'device_id', id);
  return id;
}

export async function syncPendingOperations(db: SQLite.SQLiteDatabase, limit = 50): Promise<SyncResult> {
  const pending = await getPendingSyncOperations(db, limit);
  if (!pending.length) return { attempted: 0, synced: 0, failed: 0, online: true };
  if (!API_URL || !SHOP_ID) return { attempted: pending.length, synced: 0, failed: 0, online: false };

  const deviceId = await getDeviceId(db);
  try {
    const response = await fetch(`${API_URL}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: SHOP_ID,
        deviceId,
        operations: pending.map(op => ({
          operationId: op.operation_id,
          entity: op.entity,
          entityId: op.entity_id,
          operation: op.operation,
          payload: JSON.parse(op.payload),
          createdAt: op.created_at,
        })),
      }),
    });
    if (!response.ok) throw new Error(`Sync server returned ${response.status}`);
    const body = await response.json();
    if (!body?.ok || body?.persisted !== true) throw new Error(body?.message || 'Server did not confirm persistence.');

    const accepted = new Set<string>(body.accepted || []);
    let synced = 0;
    for (const op of pending) {
      if (accepted.has(op.operation_id)) {
        await markSyncOperationSynced(db, op.operation_id);
        synced++;
      }
    }
    await setSyncState(db, 'last_sync_at', String(Date.now()));
    return { attempted: pending.length, synced, failed: pending.length - synced, online: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const op of pending) await markSyncOperationFailed(db, op.operation_id, message);
    return { attempted: pending.length, synced: 0, failed: pending.length, online: false };
  }
}
