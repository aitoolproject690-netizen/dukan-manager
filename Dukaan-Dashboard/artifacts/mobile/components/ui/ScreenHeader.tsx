import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRight?: () => void;
  onRightPress?: () => void;
  rightLabel?: string;
  rightColor?: string;
  rightIconColor?: string;
}

export function ScreenHeader({ title, subtitle, onBack, rightIcon, onRight, onRightPress, rightLabel, rightColor, rightIconColor }: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pt = Platform.OS === 'web' ? 67 + 8 : insets.top + 8;
  const rightAction = onRight ?? onRightPress;
  const iconColor = rightIconColor ?? rightColor ?? colors.foreground;

  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: pt }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onBack ?? (() => router.back())} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {rightLabel && rightAction ? (
          <TouchableOpacity onPress={rightAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.rightLabel, { color: rightColor ?? colors.primary }]}>{rightLabel}</Text>
          </TouchableOpacity>
        ) : rightIcon && rightAction ? (
          <TouchableOpacity onPress={rightAction} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={rightIcon} size={24} color={iconColor} />
          </TouchableOpacity>
        ) : <View style={styles.iconBtn} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1 },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  rightLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
