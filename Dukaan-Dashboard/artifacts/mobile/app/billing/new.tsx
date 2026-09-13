import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, FlatList, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { CartItemComponent } from '@/components/billing/CartItem';
import { ProductCard } from '@/components/products/ProductCard';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { Customer, Product, CartItem } from '@/types';
import { formatCurrencyFull } from '@/utils/format';

type PayMethod = 'cash' | 'upi' | 'credit' | 'mixed';

export default function NewBillScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, customers, addSale } = useDatabase();
  const { settings } = useApp();
  const sym = settings.currency_symbol;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [cashInput, setCashInput] = useState('');
  const [upiInput, setUpiInput] = useState('');
  const [notes, setNotes] = useState('');
  const [showProdModal, setShowProdModal] = useState(false);
  const [showCustModal, setShowCustModal] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const discountAmt = useMemo(() => Math.min(parseFloat(discount) || 0, subtotal), [discount, subtotal]);
  const total = useMemo(() => subtotal - discountAmt, [subtotal, discountAmt]);

  const computeAmounts = useCallback(() => {
    if (payMethod === 'cash') return { cash: total, upi: 0, credit: 0 };
    if (payMethod === 'upi') return { cash: 0, upi: total, credit: 0 };
    if (payMethod === 'credit') return { cash: 0, upi: 0, credit: total };
    const cash = Math.min(parseFloat(cashInput) || 0, total);
    const upi = Math.min(parseFloat(upiInput) || 0, total - cash);
    return { cash, upi, credit: Math.max(0, total - cash - upi) };
  }, [payMethod, total, cashInput, upiInput]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id);
      if (idx >= 0) return prev.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, price: product.selling_price, purchase_price: product.purchase_price, unit: product.unit }];
    });
    setShowProdModal(false);
  }, []);

  const updateQty = useCallback((index: number, qty: number) => {
    setCart(prev => qty <= 0 ? prev.filter((_, i) => i !== index) : prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  }, []);

  const handleSave = async () => {
    if (cart.length === 0) { Alert.alert('Empty Cart', 'Add at least one product'); return; }
    if ((payMethod === 'credit' || (payMethod === 'mixed' && computeAmounts().credit > 0)) && !customer) {
      Alert.alert('Customer Required', 'Select a customer to record credit'); return;
    }
    setSaving(true);
    try {
      const { cash, upi, credit } = computeAmounts();
      const pm = credit > 0 && cash === 0 && upi === 0 ? 'credit' : credit > 0 ? 'mixed' : cash > 0 && upi === 0 ? 'cash' : 'upi';
      const sale = await addSale({
        customer_id: customer?.id ?? null, customer_name: customer?.name ?? '',
        subtotal, discount: discountAmt, total, payment_method: pm,
        cash_amount: cash, upi_amount: upi, credit_amount: credit,
        notes, date: Date.now(),
      }, cart, settings.invoice_prefix);
      router.replace(`/billing/${sale.id}` as any);
    } catch (e) {
      Alert.alert('Error', 'Failed to save. Try again.');
    } finally { setSaving(false); }
  };

  const filteredProds = useMemo(() => {
    const q = prodSearch.toLowerCase().trim();
    return q ? products.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q)) : products;
  }, [products, prodSearch]);

  const filteredCusts = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    return q ? customers.filter(c => c.name.toLowerCase().includes(q) || c.mobile.includes(q)) : customers;
  }, [customers, custSearch]);

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 10;
  const mixedCredit = Math.max(0, total - (parseFloat(cashInput) || 0) - (parseFloat(upiInput) || 0));
  const PAY_METHODS: { key: PayMethod; label: string }[] = [
    { key: 'cash', label: 'Cash' }, { key: 'upi', label: 'UPI' },
    { key: 'credit', label: 'Credit' }, { key: 'mixed', label: 'Split' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="New Bill" onBack={() => router.back()} rightLabel={saving ? 'Saving…' : 'Save'} onRightPress={handleSave} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 20 }]} keyboardShouldPersistTaps="handled">

          {/* Customer */}
          <Text style={[styles.sec, { color: colors.mutedForeground }]}>CUSTOMER (Optional)</Text>
          <TouchableOpacity style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => { setCustSearch(''); setShowCustModal(true); }}>
            {customer ? (
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: colors.creditLight }]}>
                  <Text style={[styles.avatarLetter, { color: colors.credit }]}>{customer.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selName, { color: colors.foreground }]}>{customer.name}</Text>
                  {customer.mobile ? <Text style={[styles.selSub, { color: colors.mutedForeground }]}>{customer.mobile}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => setCustomer(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.row}>
                <Ionicons name="person-outline" size={20} color={colors.mutedForeground} />
                <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>Walk-in (tap to add customer)</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </View>
            )}
          </TouchableOpacity>

          {/* Cart */}
          <Text style={[styles.sec, { color: colors.mutedForeground }]}>ITEMS ({cart.length})</Text>
          {cart.map((item, idx) => (
            <CartItemComponent key={`${item.product_id}-${idx}`} item={item} index={idx} onUpdateQty={updateQty} onRemove={(i) => updateQty(i, 0)} currencySymbol={sym} />
          ))}
          <TouchableOpacity style={[styles.addItemBtn, { borderColor: colors.primary }]} onPress={() => { setProdSearch(''); setShowProdModal(true); }}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addItemText, { color: colors.primary }]}>Add Product</Text>
          </TouchableOpacity>

          {cart.length > 0 && (
            <>
              {/* Summary */}
              <Text style={[styles.sec, { color: colors.mutedForeground }]}>BILL SUMMARY</Text>
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card, gap: 12, padding: 14 }]}>
                <View style={styles.row}>
                  <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                  <Text style={[styles.sValue, { color: colors.foreground }]}>{formatCurrencyFull(subtotal, sym)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>Discount ({sym})</Text>
                  <TextInput
                    style={[styles.discInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.row}>
                  <Text style={[styles.totalLbl, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.totalAmt, { color: colors.primary }]}>{formatCurrencyFull(total, sym)}</Text>
                </View>
              </View>

              {/* Payment */}
              <Text style={[styles.sec, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>
              <View style={styles.payRow}>
                {PAY_METHODS.map(pm => (
                  <TouchableOpacity key={pm.key} style={[styles.payBtn, { borderColor: payMethod === pm.key ? colors.primary : colors.border, backgroundColor: payMethod === pm.key ? colors.secondary : colors.card }]} onPress={() => setPayMethod(pm.key)}>
                    <Text style={[styles.payText, { color: payMethod === pm.key ? colors.primary : colors.mutedForeground }]}>{pm.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {payMethod === 'mixed' && (
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card, gap: 12, padding: 14 }]}>
                  {[{ label: 'Cash', value: cashInput, set: setCashInput }, { label: 'UPI', value: upiInput, set: setUpiInput }].map(f => (
                    <View key={f.label} style={styles.row}>
                      <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>{f.label} ({sym})</Text>
                      <TextInput style={[styles.mixInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} value={f.value} onChangeText={f.set} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.mutedForeground} />
                    </View>
                  ))}
                  <View style={styles.row}>
                    <Text style={[styles.sLabel, { color: colors.mutedForeground }]}>Credit (auto)</Text>
                    <Text style={[styles.sValue, { color: colors.credit }]}>{formatCurrencyFull(mixedCredit, sym)}</Text>
                  </View>
                </View>
              )}

              {/* Notes */}
              <TextInput style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} placeholder="Note (optional)" placeholderTextColor={colors.mutedForeground} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
            </>
          )}

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: cart.length > 0 ? colors.primary : colors.muted }]} onPress={handleSave} disabled={saving || cart.length === 0} activeOpacity={0.85}>
            <Ionicons name="receipt" size={20} color={cart.length > 0 ? '#fff' : colors.mutedForeground} />
            <Text style={[styles.saveBtnTxt, { color: cart.length > 0 ? '#fff' : colors.mutedForeground }]}>
              {saving ? 'Creating Bill…' : `Create Bill${cart.length > 0 ? ' • ' + formatCurrencyFull(total, sym) : ''}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Product Modal */}
      <Modal visible={showProdModal} animationType="slide" onRequestClose={() => setShowProdModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHdr, { borderBottomColor: colors.border, paddingTop: (Platform.OS === 'ios' ? insets.top : 20) + 8 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProdModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
          <SearchBar value={prodSearch} onChangeText={setProdSearch} placeholder="Search products..." />
          <FlatList data={filteredProds} keyExtractor={p => p.id} renderItem={({ item }) => <ProductCard product={item} onPress={() => {}} onAddToCart={() => addToCart(item)} currencySymbol={sym} />} contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 20 }} />
        </View>
      </Modal>

      {/* Customer Modal */}
      <Modal visible={showCustModal} animationType="slide" onRequestClose={() => setShowCustModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHdr, { borderBottomColor: colors.border, paddingTop: (Platform.OS === 'ios' ? insets.top : 20) + 8 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Customer</Text>
            <TouchableOpacity onPress={() => setShowCustModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
          </View>
          <SearchBar value={custSearch} onChangeText={setCustSearch} placeholder="Search customers..." />
          <FlatList data={filteredCusts} keyExtractor={c => c.id} renderItem={({ item }) => <CustomerCard customer={item} onPress={() => { setCustomer(item); setShowCustModal(false); }} currencySymbol={sym} />} contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 20 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16 },
  sec: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  selName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  selSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  placeholder: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 8 },
  addItemText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  sValue: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  discInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 14, fontFamily: 'Inter_500Medium', minWidth: 80, textAlign: 'right' },
  divider: { height: 1 },
  totalLbl: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  totalAmt: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  payBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  payText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  mixInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14, fontFamily: 'Inter_500Medium', minWidth: 80, textAlign: 'right' },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 8, minHeight: 60 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginTop: 16 },
  saveBtnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalRoot: { flex: 1 },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
});
