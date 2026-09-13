import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
  small?: boolean;
}

export function StatCard({ label, value, icon, color, bgColor, onPress, small }: StatCardProps) {
  const colors = useColors();

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: bgColor ?? colors.muted }]}>
        {icon}
      </View>
      <Text style={[styles.value, { color: color ?? colors.foreground }, small && styles.valueSmall]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 0,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  valueSmall: {
    fontSize: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.2,
  },
});
