import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FAB({ onPress, icon = 'add' }: FABProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + 72 + (Platform.OS === 'web' ? 34 : 0);
  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.accent, bottom, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
