import * as SQLite from 'expo-sqlite';
import { getPendingSyncOperations, markSyncOperationFailed, markSyncOperationSynced, setSyncState } from '@/db/database';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';

export type SyncResult = { attempted: number; synced: number; failed: number; online: boolean };

export async function syncPendingOperations(db: SQLite.SQLiteDatabase, limit = 50): Promise<SyncResult> {
  const pending = await getPendingSyncOperations(db, limit);
  if (!pending.length) return { attempted: 0, synced: 0, failed: 0, online: true };
  if (!API_URL) return { attempted: pending.length, synced: 0, failed: 0, online: false };

  try {
    const response = await fetch(`${API_URL}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    if (!body?.ok || body?.persisted !== true) {
      // Never mark local money/accounting operations as synced until the
      // server confirms durable persistence.
      throw new Error(body?.message || 'Server did not confirm persistence.');
    }

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
