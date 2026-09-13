import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getDB } from '@/db/database';
import { syncPendingOperations } from './sync';

const SYNC_INTERVAL_MS = 30_000;

export function SyncRunner() {
  const running = useRef(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted || running.current) return;
      running.current = true;
      try {
        const db = await getDB();
        await syncPendingOperations(db, 100);
      } catch (error) {
        // Sync must never block the shop UI; pending operations remain in the outbox.
        console.warn('[sync]', error);
      } finally {
        running.current = false;
      }
    };

    void run();
    const timer = setInterval(() => void run(), SYNC_INTERVAL_MS);

    const onStateChange = (state: AppStateStatus) => {
      if (state === 'active') void run();
    };
    const subscription = AppState.addEventListener('change', onStateChange);

    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return null;
}
