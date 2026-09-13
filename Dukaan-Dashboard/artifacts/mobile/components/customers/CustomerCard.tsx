import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Customer } from '@/types';
import { formatCurrencyFull } from '@/utils/format';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
  currencySymbol?: string;
}

export function CustomerCard({ customer, onPress, currencySymbol = '₹' }: CustomerCardProps) {
  const colors = useColors();
  const hasCredit = customer.credit_balance > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.avatar, { backgroundColor: hasCredit ? colors.creditLight : colors.muted }]}>
        <Text style={[styles.avatarText, { color: hasCredit ? colors.credit : colors.mutedForeground }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{customer.name}</Text>
        {customer.mobile ? (
          <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{customer.mobile}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {hasCredit ? (
          <>
            <Text style={[styles.creditLabel, { color: colors.mutedForeground }]}>To collect</Text>
            <Text style={[styles.creditAmount, { color: colors.credit }]}>
              {formatCurrencyFull(customer.credit_balance, currencySymbol)}
            </Text>
          </>
        ) : (
          <View style={[styles.clearedBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.clearedText, { color: colors.success }]}>Cleared</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.border} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  mobile: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  right: { alignItems: 'flex-end', flexDirection: 'row', gap: 4 },
  creditLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  creditAmount: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  clearedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  clearedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  chevron: { marginLeft: 4 },
});
