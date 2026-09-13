import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Vibration } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';

const PIN_KEY = 'dukaan_pin';

interface PinLockOverlayProps {
  onUnlock: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

export function PinLockOverlay({ onUnlock }: PinLockOverlayProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useApp();
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');

  const tryBiometric = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const LocalAuth = await import('expo-local-authentication');
      const has = await LocalAuth.hasHardwareAsync();
      const enrolled = await LocalAuth.isEnrolledAsync();
      if (!has || !enrolled) {
        Alert.alert('Biometric not available');
        return;
      }
      const result = await LocalAuth.authenticateAsync({ promptMessage: 'Verify your identity', cancelLabel: 'Use PIN' });
      if (result.success) onUnlock();
    } catch {
      // ignore
    }
  }, [onUnlock]);

  const handleKey = useCallback(async (key: string) => {
    if (key === 'bio') { tryBiometric(); return; }
    if (key === 'del') { setEntered(p => p.slice(0, -1)); setError(''); return; }

    const next = entered + key;
    setEntered(next);

    if (next.length === 4) {
      const stored = await SecureStore.getItemAsync(PIN_KEY);
      if (next === stored) {
        onUnlock();
      } else {
        Vibration.vibrate(300);
        setError('Incorrect PIN. Try again.');
        setEntered('');
      }
    }
  }, [entered, onUnlock, tryBiometric]);

  const pt = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background, paddingTop: pt + 20 }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
        <Ionicons name="lock-closed" size={32} color="#fff" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Dukaan Manager</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Enter your PIN to continue</Text>

      {/* Dots */}
      <View style={styles.dots}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i < entered.length ? colors.primary : colors.border }]}
          />
        ))}
      </View>

      {error ? <Text style={[styles.error, { color: colors.expense }]}>{error}</Text> : <View style={styles.errorPlaceholder} />}

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map(key => {
          if (key === 'bio') {
            return (
              <TouchableOpacity
                key={key}
                style={[styles.key, styles.keyGhost]}
                onPress={tryBiometric}
                activeOpacity={0.7}
              >
                {settings.fingerprint_enabled && Platform.OS !== 'web' ? (
                  <Ionicons name="finger-print" size={28} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          }
          if (key === 'del') {
            return (
              <TouchableOpacity
                key={key}
                style={[styles.key, styles.keyGhost]}
                onPress={() => handleKey('del')}
                activeOpacity={0.7}
              >
                <Ionicons name="backspace-outline" size={24} color={colors.foreground} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={key}
              style={[styles.key, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleKey(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: colors.foreground }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </View>
  );
}

export async function savePIN(pin: string) {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored === pin;
}

export async function clearPIN() {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 32 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 8, height: 20 },
  errorPlaceholder: { height: 32 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center', gap: 12, marginTop: 8 },
  key: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  keyGhost: { backgroundColor: 'transparent', borderWidth: 0 },
  keyText: { fontSize: 24, fontFamily: 'Inter_500Medium' },
});
