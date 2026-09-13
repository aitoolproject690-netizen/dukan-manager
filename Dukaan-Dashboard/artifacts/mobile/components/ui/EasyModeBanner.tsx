import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Props = {
  onPress: () => void;
};

/** Large, low-reading-load shortcuts for users who are not comfortable with small controls. */
export function EasyModeBanner({ onPress }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open easy mode"
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
        <Ionicons name="hand-right-outline" size={26} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.foreground }]}>Easy Mode</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Bade buttons • simple billing • kam typing</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
});
