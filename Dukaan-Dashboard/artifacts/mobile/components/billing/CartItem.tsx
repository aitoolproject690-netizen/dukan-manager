import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CartItem as CartItemType } from '@/types';
import { formatCurrencyFull } from '@/utils/format';

interface CartItemProps {
  item: CartItemType;
  index: number;
  onUpdateQty: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
  onEditPrice?: (index: number, price: number) => void;
  currencySymbol?: string;
}

export function CartItemComponent({ item, index, onUpdateQty, onRemove, onEditPrice, currencySymbol = '₹' }: CartItemProps) {
  const colors = useColors();
  const lineTotal = item.price * item.quantity;

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.product_name}</Text>
        <Text style={[styles.price, { color: colors.mutedForeground }]}>
          {formatCurrencyFull(item.price, currencySymbol)} / {item.unit || 'pcs'}
        </Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
          onPress={() => onUpdateQty(index, item.quantity - 1)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="remove" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
        <TouchableOpacity
          style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
          onPress={() => onUpdateQty(index, item.quantity + 1)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.totalBlock}>
        <Text style={[styles.total, { color: colors.foreground }]}>{formatCurrencyFull(lineTotal, currencySymbol)}</Text>
        <TouchableOpacity onPress={() => onRemove(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={colors.expense} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  price: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 15, fontFamily: 'Inter_700Bold', minWidth: 24, textAlign: 'center' },
  totalBlock: { alignItems: 'flex-end', gap: 4 },
  total: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
