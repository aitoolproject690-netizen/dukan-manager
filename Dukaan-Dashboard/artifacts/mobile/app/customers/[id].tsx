import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, Platform, Linking, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/context/DatabaseContext';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Customer, KhataTransaction } from '@/types';
import { formatCurrencyFull, formatDate, formatTime } from '@/utils/format';

type TxType = 'credit' | 'payment';

export default function CustomerDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customers, getKhataTransactions, addKhataTransaction, deleteKhataTransaction } = useDatabase();
  const { settings } = useApp();
  const sym = settings.currency_symbol;

  const customer = customers.find(c => c.id === id);
  const [transactions, setTransactions] = useState<KhataTransaction[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [txType, setTxType] = useState<TxType>('credit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTx = useCallback(async () => {
    if (!id) return;
    const list = await getKhataTransactions(id);
    setTransactions(list);
  }, [id, getKhataTransactions]);

  useEffect(() => { loadTx(); }, [loadTx]);

  if (!customer) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Customer" onBack={() => router.back()} />
        <EmptyState icon="person-outline" title="Customer not found" description="This customer may have been deleted" />
      </View>
    );
  }

  const handleWhatsApp = () => {
    if (!customer.mobile) { Alert.alert('No mobile number'); return; }
    const phone = customer.mobile.replace(/\D/g, '');
    const message = `Dear ${customer.name},\n\nYou have a pending balance of ${sym}${customer.credit_balance.toFixed(0)} at ${settings.business_name}.\n\nKindly settle your dues at your earliest convenience.\n\nThank you!`;
    Linking.openURL(`whatsapp://send?phone=91${phone}&text=${encodeURIComponent(message)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to send reminders')
    );
  };

  const handleAddTx = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { Alert.alert('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await addKhataTransaction({ customer_id: customer.id, type: txType, amount: val, note, date: Date.now() });
      setShowModal(false);
      setAmount('');
      setNote('');
      await loadTx();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTx = (tx: KhataTransaction) => {
    Alert.alert('Delete Entry', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteKhataTransaction(tx.id, tx.customer_id, tx.type, tx.amount); await loadTx(); } },
    ]);
  };

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 10;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={customer.name}
        onBack={() => router.back()}
        rightIcon={customer.mobile ? 'logo-whatsapp' : undefined}
        onRightPress={customer.mobile ? handleWhatsApp : undefined}
        rightIconColor="#25D366"
      />
      <FlatList
        data={transactions}
        keyExtractor={t => t.id}
        ListHeaderComponent={
          <View>
            {/* Customer Info Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: customer.credit_balance > 0 ? colors.creditLight : colors.muted }]}>
                <Text style={[styles.avatarText, { color: customer.credit_balance > 0 ? colors.credit : colors.mutedForeground }]}>
                  {customer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: colors.foreground }]}>{customer.name}</Text>
                {customer.mobile ? <Text style={[styles.infoText, { color: colors.mutedForeground }]}><Ionicons name="call-outline" size={13} /> {customer.mobile}</Text> : null}
                {customer.address ? <Text style={[styles.infoText, { color: colors.mutedForeground }]}><Ionicons name="location-outline" size={13} /> {customer.address}</Text> : null}
              </View>
            </View>

            {/* Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: customer.credit_balance > 0 ? colors.creditLight : colors.successLight, borderColor: customer.credit_balance > 0 ? colors.credit : colors.success }]}>
              <Text style={[styles.balanceLabel, { color: customer.credit_balance > 0 ? colors.credit : colors.success }]}>
                {customer.credit_balance > 0 ? 'Pending Credit' : 'All Settled'}
              </Text>
              <Text style={[styles.balanceAmt, { color: customer.credit_balance > 0 ? colors.credit : colors.success }]}>
                {formatCurrencyFull(customer.credit_balance, sym)}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.creditLight, borderColor: colors.credit }]} onPress={() => { setTxType('credit'); setShowModal(true); }}>
                <Ionicons name="add-circle-outline" size={20} color={colors.credit} />
                <Text style={[styles.actionBtnText, { color: colors.credit }]}>Give Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight, borderColor: colors.success }]} onPress={() => { setTxType('payment'); setShowModal(true); }}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <Text style={[styles.actionBtnText, { color: colors.success }]}>Received Payment</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.txLabel, { color: colors.mutedForeground }]}>TRANSACTION HISTORY</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onLongPress={() => handleDeleteTx(item)}
            activeOpacity={0.8}
          >
            <View style={[styles.txIcon, { backgroundColor: item.type === 'credit' ? colors.creditLight : colors.successLight }]}>
              <Ionicons name={item.type === 'credit' ? 'arrow-up' : 'arrow-down'} size={18} color={item.type === 'credit' ? colors.credit : colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txType, { color: colors.foreground }]}>{item.type === 'credit' ? 'Credit Given' : 'Payment Received'}</Text>
              {item.note ? <Text style={[styles.txNote, { color: colors.mutedForeground }]} numberOfLines={1}>{item.note}</Text> : null}
              <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{formatDate(item.date)} · {formatTime(item.date)}</Text>
            </View>
            <Text style={[styles.txAmt, { color: item.type === 'credit' ? colors.credit : colors.success }]}>
              {item.type === 'credit' ? '+' : '-'}{formatCurrencyFull(item.amount, sym)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="document-outline" title="No transactions" description="No credit or payment history yet" />}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 10 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Transaction Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {txType === 'credit' ? 'Give Credit' : 'Received Payment'}
              </Text>

              {/* Type Toggle */}
              <View style={[styles.toggleRow, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                {(['credit', 'payment'] as TxType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleBtn, txType === t && { backgroundColor: colors.card }]}
                    onPress={() => setTxType(t)}
                  >
                    <Text style={[styles.toggleText, { color: txType === t ? (t === 'credit' ? colors.credit : colors.success) : colors.mutedForeground }]}>
                      {t === 'credit' ? 'Credit' : 'Payment'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder={`Amount (${sym})`}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="Note (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={note}
                onChangeText={setNote}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.muted }]} onPress={() => setShowModal(false)}>
                  <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: txType === 'credit' ? colors.credit : colors.success }]}
                  onPress={handleAddTx}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  infoCard: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  customerName: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  infoText: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  balanceCard: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12, alignItems: 'center' },
  balanceLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  balanceAmt: { fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  txLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  txType: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  txNote: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  txDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  txAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: { borderRadius: 20, borderWidth: 1, padding: 20, margin: 12, marginBottom: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  toggleRow: { flexDirection: 'row', padding: 4 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  toggleText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
