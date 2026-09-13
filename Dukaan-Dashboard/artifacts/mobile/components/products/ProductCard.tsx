import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/types';
import { formatCurrencyFull } from '@/utils/format';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  currencySymbol?: string;
}

export function ProductCard({ product, onPress, onAddToCart, currencySymbol = '₹' }: ProductCardProps) {
  const colors = useColors();
  const isLowStock = product.stock <= product.low_stock_alert;
  const isOutOfStock = product.stock <= 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: isOutOfStock ? colors.expenseLight : isLowStock ? colors.warningLight : colors.muted }]}>
        <Ionicons name="cube-outline" size={22} color={isOutOfStock ? colors.expense : isLowStock ? colors.warning : colors.mutedForeground} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
        <View style={styles.meta}>
          <Text style={[styles.price, { color: colors.success }]}>{formatCurrencyFull(product.selling_price, currencySymbol)}</Text>
          <Text style={[styles.dot, { color: colors.border }]}> • </Text>
          <Text style={[styles.stock, { color: isOutOfStock ? colors.expense : isLowStock ? colors.warning : colors.mutedForeground }]}>
            {product.stock} {product.unit}
            {isLowStock && !isOutOfStock ? ' (Low)' : ''}
            {isOutOfStock ? ' (Out)' : ''}
          </Text>
        </View>
        <Text style={[styles.costPrice, { color: colors.mutedForeground }]}>Cost: {formatCurrencyFull(product.purchase_price, currencySymbol)}</Text>
      </View>
      {onAddToCart ? (
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={onAddToCart}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.border} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  price: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  dot: { fontSize: 14 },
  stock: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  costPrice: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
