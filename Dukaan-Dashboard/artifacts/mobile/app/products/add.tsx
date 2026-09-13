import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen', 'meter'];

export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, updateProduct, deleteProduct } = useDatabase();
  const { settings } = useApp();
  const sym = settings.currency_symbol;

  const existing = id ? products.find(p => p.id === id) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [barcode, setBarcode] = useState(existing?.barcode ?? '');
  const [purchasePrice, setPurchasePrice] = useState(existing?.purchase_price?.toString() ?? '');
  const [sellingPrice, setSellingPrice] = useState(existing?.selling_price?.toString() ?? '');
  const [stock, setStock] = useState(existing?.stock?.toString() ?? '0');
  const [unit, setUnit] = useState(existing?.unit ?? 'pcs');
  const [lowStockAlert, setLowStockAlert] = useState(existing?.low_stock_alert?.toString() ?? '5');
  const [saving, setSaving] = useState(false);

  const profit = (parseFloat(sellingPrice) || 0) - (parseFloat(purchasePrice) || 0);
  const purchase = parseFloat(purchasePrice) || 0;
  const margin = purchase > 0 ? ((profit / purchase) * 100).toFixed(1) : '0';

  const handleSave = async () => {
    const purchaseValue = Number(purchasePrice);
    const sellingValue = Number(sellingPrice);
    const stockValue = Number(stock);
    const lowStockValue = Number(lowStockAlert);

    if (!name.trim()) { Alert.alert('Name required', 'Please enter the product name.'); return; }
    if (!Number.isFinite(purchaseValue) || purchaseValue < 0) { Alert.alert('Invalid purchase price', 'Purchase price cannot be negative.'); return; }
    if (!Number.isFinite(sellingValue) || sellingValue <= 0) { Alert.alert('Invalid selling price', 'Selling price must be greater than 0.'); return; }
    if (!Number.isFinite(stockValue) || stockValue < 0) { Alert.alert('Invalid stock', 'Stock cannot be negative.'); return; }
    if (!Number.isFinite(lowStockValue) || lowStockValue < 0) { Alert.alert('Invalid low-stock alert', 'Low-stock alert cannot be negative.'); return; }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        barcode: barcode.trim(),
        purchase_price: purchaseValue,
        selling_price: sellingValue,
        stock: stockValue,
        unit,
        low_stock_alert: Math.floor(lowStockValue),
      };
      if (isEdit && existing) {
        await updateProduct(existing.id, data);
      } else {
        await addProduct(data);
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', `Delete "${existing?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteProduct(id!);
          router.back();
        } catch {
          Alert.alert('Error', 'Failed to delete product.');
        }
      } },
    ]);
  };

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 10;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isEdit ? 'Edit Product' : 'Add Product'}
        onBack={() => router.back()}
        rightIcon={isEdit ? 'trash-outline' : undefined}
        onRightPress={isEdit ? handleDelete : undefined}
        rightIconColor={colors.expense}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 20 }]} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Product Name *</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={name} onChangeText={setName} placeholder="e.g. Basmati Rice 5kg" placeholderTextColor={colors.mutedForeground} />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Barcode (optional)</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={barcode} onChangeText={setBarcode} placeholder="Scan or enter barcode" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Purchase Price ({sym})</Text>
              <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Selling Price ({sym})</Text>
              <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={sellingPrice} onChangeText={setSellingPrice} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
            </View>
          </View>

          {purchasePrice && sellingPrice && (
            <View style={[styles.profitBadge, { backgroundColor: profit >= 0 ? colors.successLight : colors.expenseLight }]}>
              <Text style={[styles.profitText, { color: profit >= 0 ? colors.success : colors.expense }]}>
                Profit: {sym}{profit.toFixed(2)} ({margin}% margin)
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Stock Quantity</Text>
              <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={stock} onChangeText={setStock} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Unit</Text>
              <TouchableOpacity style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]} onPress={() => {
                const idx = UNITS.indexOf(unit);
                setUnit(UNITS[(idx + 1) % UNITS.length]);
              }}>
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>{unit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Low Stock Alert Below</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} value={lowStockAlert} onChangeText={setLowStockAlert} placeholder="5" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row' },
  profitBadge: { padding: 10, borderRadius: 10, marginTop: 6, marginBottom: 4 },
  profitText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});