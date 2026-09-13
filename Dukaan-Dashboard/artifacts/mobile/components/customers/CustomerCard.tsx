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
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}${hasCredit ? `, ${formatCurrencyFull(customer.credit_balance, currencySymbol)} to collect` : ', cleared'}`}
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
          <View style={styles.amountWrap}>
            <Text style={[styles.creditLabel, { color: colors.mutedForeground }]}>To collect</Text>
            <Text style={[styles.creditAmount, { color: colors.credit }]}>
              {formatCurrencyFull(customer.credit_balance, currencySymbol)}
            </Text>
          </View>
        ) : (
          <View style={[styles.clearedBadge, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
            <Text style={[styles.clearedText, { color: colors.success }]}>Cleared</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  mobile: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  right: { alignItems: 'center', flexDirection: 'row', gap: 7, maxWidth: '52%' },
  amountWrap: { alignItems: 'flex-end' },
  creditLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  creditAmount: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 2 },
  clearedBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearedText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  chevron: { marginLeft: 2 },
});
