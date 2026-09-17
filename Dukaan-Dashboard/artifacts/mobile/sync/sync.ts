import * as SQLite from 'expo-sqlite';
import { getPendingSyncOperations, getSyncState, markSyncOperationFailed, markSyncOperationSynced, setSyncState } from '@/db/database';
import { applySyncBatch } from './applySync';
import { ensureSyncTriggerMigration } from './syncTriggerMigration';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
const SHOP_ID = process.env.EXPO_PUBLIC_SHOP_ID?.trim() || '';
const SYNC_TOKEN = process.env.EXPO_PUBLIC_SYNC_TOKEN?.trim() || '';

export type SyncResult = { attempted: number; synced: number; failed: number; pulled: number; online: boolean };

function syncHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Sync-Token': SYNC_TOKEN };
}

async function getDeviceId(db: SQLite.SQLiteDatabase): Promise<string> {
  const existing = await getSyncState(db, 'device_id');
  if (existing) return existing;
  const id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await setSyncState(db, 'device_id', id);
  return id;
}

async function pullRemoteOperations(db: SQLite.SQLiteDatabase, deviceId: string, limit = 100): Promise<number> {
  const cursor = Number(await getSyncState(db, 'last_server_at') || '0');
  const response = await fetch(`${API_URL}/sync/pull?shopId=${encodeURIComponent(SHOP_ID)}&since=${cursor}&limit=${Math.max(1, Math.min(limit, 200))}`, { headers: syncHeaders() });
  if (!response.ok) throw new Error(`Sync pull returned ${response.status}`);
  const body = await response.json();
  if (!body?.ok || body?.persisted !== true || !Array.isArray(body.operations)) throw new Error('Server did not confirm sync pull.');
  const remote = body.operations.filter((op: any) => op.deviceId !== deviceId);
  const nextCursor = await applySyncBatch(db, remote, cursor);
  if (nextCursor > cursor) await setSyncState(db, 'last_server_at', String(nextCursor));
  return remote.length;
}

export async function syncPendingOperations(db: SQLite.SQLiteDatabase, limit = 50): Promise<SyncResult> {
  // Initialize the hardened outbox even when the device is offline or sync
  // environment variables are not configured yet. This keeps local mutations
  // safe and ready to sync later instead of leaving legacy triggers active.
  await ensureSyncTriggerMigration(db);
  if (!API_URL || !SHOP_ID || !SYNC_TOKEN) return { attempted: 0, synced: 0, failed: 0, pulled: 0, online: false };

  const pending = await getPendingSyncOperations(db, limit);
  const deviceId = await getDeviceId(db);
  let synced = 0;
  let pulled = 0;
  let unsynced = pending;

  try {
    if (pending.length) {
      const response = await fetch(`${API_URL}/sync/push`, {
        method: 'POST',
        headers: syncHeaders(),
        body: JSON.stringify({
          shopId: SHOP_ID,
          deviceId,
          operations: pending.map(op => ({ operationId: op.operation_id, entity: op.entity, entityId: op.entity_id, operation: op.operation, payload: JSON.parse(op.payload), createdAt: op.created_at })),
        }),
      });
      if (!response.ok) throw new Error(`Sync server returned ${response.status}`);
      const body = await response.json();
      if (!body?.ok || body?.persisted !== true) throw new Error(body?.message || 'Server did not confirm persistence.');
      const accepted = new Set<string>(body.accepted || []);
      unsynced = pending.filter(op => !accepted.has(op.operation_id));
      for (const op of pending) if (accepted.has(op.operation_id)) { await markSyncOperationSynced(db, op.operation_id); synced++; }
    }

    pulled = await pullRemoteOperations(db, deviceId);
    await setSyncState(db, 'last_sync_at', String(Date.now()));
    return { attempted: pending.length, synced, failed: unsynced.length, pulled, online: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    for (const op of unsynced) await markSyncOperationFailed(db, op.operation_id, message);
    return { attempted: pending.length, synced, failed: unsynced.length, pulled, online: false };
  }
}
