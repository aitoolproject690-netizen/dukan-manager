import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from '@/types';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | null>(null);
const SETTINGS_KEY = '@dukaan_settings';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);
        if (merged.pin_enabled || merged.fingerprint_enabled) {
          setIsLocked(true);
        }
      }
    } catch {
      // use defaults
    } finally {
      setIsInitialized(true);
    }
  }

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setLocked = useCallback((locked: boolean) => {
    setIsLocked(locked);
  }, []);

  return (
    <AppContext.Provider value={{ settings, updateSettings, isLocked, setLocked, isInitialized }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
