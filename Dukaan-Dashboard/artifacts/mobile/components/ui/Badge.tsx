import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'credit';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'muted' }: BadgeProps) {
  const colors = useColors();
  const config: Record<BadgeVariant, { bg: string; fg: string }> = {
    primary: { bg: colors.secondary, fg: colors.primary },
    success: { bg: colors.successLight, fg: colors.success },
    warning: { bg: colors.warningLight, fg: colors.warning },
    danger: { bg: colors.expenseLight, fg: colors.expense },
    muted: { bg: colors.muted, fg: colors.mutedForeground },
    credit: { bg: colors.creditLight, fg: colors.credit },
  };
  const { bg, fg } = config[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
